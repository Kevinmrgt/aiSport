export type AiProvider = 'openai';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model?: string;
}

interface AiCallOptions {
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

interface OpenAiChatResponse {
  choices: Array<{ message: { content: string } }>;
}

// OWASP A10: timeout strict sur tous les appels IA externes.
// Le default reste conservateur pour les generations multi-appels.
const DEFAULT_TIMEOUT_MS = 20_000;

export class AiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Appel IA interrompu apres ${timeoutMs}ms`);
    this.name = 'AiTimeoutError';
  }
}

export async function callAiProvider(
  config: AiConfig,
  prompt: string,
  options: AiCallOptions = {},
): Promise<string> {
  const model = config.model ?? DEFAULT_OPENAI_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await callOpenAi(config.apiKey, model, prompt, controller.signal, options);
  } catch (error) {
    if (timedOut) {
      throw new AiTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOpenAi(
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
  options: AiCallOptions,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      response_format: { type: 'json_object' },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API erreur: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OpenAiChatResponse;
  const content = data.choices[0]?.message.content;
  if (!content) throw new Error('Reponse OpenAI vide');
  return content;
}
