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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const baseUrl: string = body.baseUrl || 'http://localhost:1234/v1';
  const model: string = body.model || 'local-model';

  const article = db
    .prepare('SELECT title, content, snippet FROM articles WHERE id = ?')
    .get(Number(id)) as { title: string; content: string; snippet: string } | undefined;

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const rawText = stripHtml(article.content || article.snippet || '');
  if (!rawText) {
    return NextResponse.json({ error: 'No content to summarize' }, { status: 400 });
  }

  // Truncate to ~4000 words to stay within typical context limits
  const words = rawText.split(' ');
  const truncated = words.slice(0, 4000).join(' ');

  const prompt = `Summarize the following article in 3–5 concise bullet points. Focus on the key takeaways. Use "•" as the bullet character and put each bullet on its own line. Do not include any introduction or closing sentence — just the bullets.

Title: ${article.title}

${truncated}`;

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
            content:
              'You are a concise summarization assistant. You summarize articles into clear, informative bullet points.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
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

  const data = await lmResponse.json();
  const summary: string = data.choices?.[0]?.message?.content?.trim() || '';

  if (!summary) {
    return NextResponse.json({ error: 'LM Studio returned an empty response' }, { status: 502 });
  }

  return NextResponse.json({ summary });
}
