export interface AICallParams {
  protocol: 'lmstudio' | 'openai' | 'anthropic';
  baseUrl: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface AICallResult {
  content: string;
}

export async function callAI(params: AICallParams): Promise<AICallResult> {
  const { protocol, baseUrl, model, apiKey, systemPrompt, userPrompt, maxTokens, temperature } = params;

  if (protocol === 'anthropic') {
    const url = `${baseUrl.replace(/\/$/, '')}/v1/messages`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new APIError(res.status, `Anthropic API returned ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const content: string = data.content?.[0]?.text?.trim() || '';
    return { content };
  }

  // OpenAI-compatible (lmstudio or openai)
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new APIError(res.status, `AI endpoint returned ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content?.trim() || '';
  return { content };
}

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
