export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TAG_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const baseUrl: string = body.baseUrl || 'http://localhost:1234/v1';
  const model: string = body.model || 'local-model';

  const article = db
    .prepare('SELECT id, title, content, snippet FROM articles WHERE id = ?')
    .get(Number(id)) as { id: number; title: string; content: string; snippet: string } | undefined;

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // Get all existing tags
  const allTags = db.prepare('SELECT id, name, color FROM tags ORDER BY name ASC').all() as {
    id: number;
    name: string;
    color: string;
  }[];

  // Get tags already on this article
  const existingArticleTags = db.prepare(`
    SELECT t.id, t.name FROM article_tags at JOIN tags t ON t.id = at.tag_id WHERE at.article_id = ?
  `).all(Number(id)) as { id: number; name: string }[];
  const existingTagNames = new Set(existingArticleTags.map((t) => t.name.toLowerCase()));

  // Build article text
  const rawText = stripHtml(article.content || article.snippet || '');
  const words = rawText.split(' ');
  const excerpt = words.slice(0, 800).join(' ');

  const alreadyApplied = existingArticleTags.map((t) => t.name).join(', ') || 'none';
  const tagList = allTags.length > 0
    ? allTags.map((t) => t.name).join(', ')
    : '(none yet)';

  const prompt = `Tag the following article. Be generous — suggest 3 to 6 tags total that describe its topic, themes, and subject matter. The user can always remove tags they don't want.

Article title: ${article.title}
Article excerpt: ${excerpt}

Existing tags in the library: ${tagList}
Tags already on this article (skip these): ${alreadyApplied}

Rules:
1. Reuse tags from the library whenever they fit — even loosely.
2. Create new tags freely for any topic, theme, technology, person, concept, or domain the article covers that isn't already in the library. Aim for 2–4 new tags if the article covers ground not in the library.
3. New tags must be lowercase, 1–3 words, no punctuation.
4. Do NOT repeat tags already on this article.
5. Respond with JSON only — no markdown, no explanation.

{"apply": ["library-tag"], "create": ["new-tag-1", "new-tag-2"]}`;


  let lmResponse: Response;
  try {
    lmResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a tagging assistant. Always respond with valid JSON only — no markdown, no explanation, just the JSON object.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
        stream: false,
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Could not reach LM Studio at ${baseUrl}. Is it running?\n${message}` },
      { status: 502 }
    );
  }

  if (!lmResponse.ok) {
    const errText = await lmResponse.text().catch(() => '');
    return NextResponse.json(
      { error: `LM Studio returned ${lmResponse.status}: ${errText}` },
      { status: 502 }
    );
  }

  const lmData = await lmResponse.json();
  const rawContent: string = lmData.choices?.[0]?.message?.content?.trim() || '';

  if (!rawContent) {
    return NextResponse.json({ error: 'LM Studio returned an empty response' }, { status: 502 });
  }

  // Parse JSON — strip markdown code fences if present
  let parsed: { apply?: string[]; create?: string[] };
  try {
    const jsonStr = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try to extract JSON object from the response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: `Could not parse LM Studio response as JSON: ${rawContent.slice(0, 200)}` },
        { status: 502 }
      );
    }
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: `Invalid JSON in LM Studio response: ${rawContent.slice(0, 200)}` },
        { status: 502 }
      );
    }
  }

  const toApply: string[] = Array.isArray(parsed.apply) ? parsed.apply : [];
  const toCreate: string[] = Array.isArray(parsed.create) ? parsed.create : [];

  // Build a name→id map for existing tags
  const tagMap = new Map(allTags.map((t) => [t.name.toLowerCase(), t.id]));

  const insertArticleTag = db.prepare(
    'INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)'
  );

  const applyTag = db.transaction((tagId: number) => {
    insertArticleTag.run(Number(id), tagId);
  });

  let appliedCount = 0;
  let createdCount = 0;

  // Apply existing tags
  for (const name of toApply) {
    const normalized = name.trim().toLowerCase();
    if (!normalized || existingTagNames.has(normalized)) continue;
    const tagId = tagMap.get(normalized);
    if (tagId) {
      applyTag(tagId);
      existingTagNames.add(normalized);
      appliedCount++;
    }
  }

  // Create and apply new tags (allow up to 6)
  for (const name of toCreate.slice(0, 6)) {
    const normalized = name.trim().toLowerCase();
    if (!normalized || existingTagNames.has(normalized) || tagMap.has(normalized)) continue;

    // Auto-assign color based on total tag count
    const { count } = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number };
    const color = TAG_COLORS[count % TAG_COLORS.length];

    const result = db.prepare(
      'INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)'
    ).run(normalized, color);

    if (result.lastInsertRowid) {
      const newTagId = Number(result.lastInsertRowid);
      applyTag(newTagId);
      existingTagNames.add(normalized);
      tagMap.set(normalized, newTagId);
      createdCount++;
    }
  }

  // Return updated tag list for this article
  const updatedTags = db.prepare(`
    SELECT t.id, t.name, t.color
    FROM article_tags at
    JOIN tags t ON t.id = at.tag_id
    WHERE at.article_id = ?
    ORDER BY t.name ASC
  `).all(Number(id)) as { id: number; name: string; color: string }[];

  return NextResponse.json({ tags: updatedTags, appliedCount, createdCount });
}
