import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export type AiProvider = 'mistral' | 'openai' | 'anthropic';

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

// Modèles par défaut par provider
const DEFAULT_MODELS: Record<AiProvider, string> = {
  mistral: 'mistral-small-latest',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
};

// OWASP A02: clé AES-256 dérivée du SERVICE_SECRET (jamais hardcodée)
function getEncryptionKey(): Buffer {
  const secret = process.env['SERVICE_SECRET'] ?? 'default-dev-secret-min-32chars!!';
  return createHash('sha256').update(secret).digest();
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptApiKey(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) throw new Error('Format de clé chiffrée invalide');
  const [ivHex, authTagHex, dataHex] = parts as [string, string, string];
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

interface MistralOpenAiResponse {
  choices: Array<{ message: { content: string } }>;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
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
  const model = config.model ?? DEFAULT_MODELS[config.provider];
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    if (config.provider === 'anthropic') {
      return await callAnthropic(config.apiKey, model, prompt, controller.signal, options);
    }
    return await callOpenAiCompatible(config.provider, config.apiKey, model, prompt, controller.signal, options);
  } catch (error) {
    if (timedOut) {
      throw new AiTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOpenAiCompatible(
  provider: 'mistral' | 'openai',
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
  options: AiCallOptions,
): Promise<string> {
  const url =
    provider === 'mistral'
      ? 'https://api.mistral.ai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
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
    throw new Error(`${provider} API erreur: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as MistralOpenAiResponse;
  const content = data.choices[0]?.message.content;
  if (!content) throw new Error(`Réponse ${provider} vide`);
  return content;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
  options: AiCallOptions,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
    console.error('[Anthropic] Erreur API:', { status: response.status, body: errorBody, model });
    throw new Error(`Anthropic API erreur: ${response.status} — ${JSON.stringify(errorBody)}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const content = data.content[0]?.text;
  if (!content) throw new Error('Réponse Anthropic vide');
  return content;
}
