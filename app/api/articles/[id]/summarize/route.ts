export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { callAI, APIError } from '@/lib/ai-call';

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
  const protocol: string = body.protocol || 'lmstudio';
  const baseUrl: string = body.baseUrl || 'http://localhost:1234/v1';
  const model: string = body.model || 'local-model';
  const apiKey: string = body.apiKey || '';

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

  let summary: string;
  try {
    const result = await callAI({
      protocol: protocol as 'lmstudio' | 'openai' | 'anthropic',
      baseUrl,
      model,
      apiKey,
      systemPrompt: 'You are a concise summarization assistant. You summarize articles into clear, informative bullet points.',
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 512,
    });
    summary = result.content;
  } catch (err: unknown) {
    if (err instanceof APIError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Could not reach AI endpoint at ${baseUrl}.\n${message}` },
      { status: 502 }
    );
  }

  if (!summary) {
    return NextResponse.json({ error: 'AI returned an empty response' }, { status: 502 });
  }

  return NextResponse.json({ summary });
}
