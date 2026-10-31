import { randomUUID } from 'node:crypto';
import { AppError } from '../types/app-error.js';

export type AiProvider = 'openai';
export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model?: string;
}
export interface AiAttempt {
  receiptId?: string;
  model: string;
  maxCompletionTokens: number;
  inputTokensUpperBound: number;
}
export interface AiUsage {
  receiptId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestId?: string;
}
export interface AiExecutionOptions {
  signal?: AbortSignal;
  /** Awaited before each HTTP attempt. Rejecting prevents the provider call. */
  onAttempt?: (attempt: AiAttempt) => void | Promise<void>;
  /** Reported before content validation, including refused/truncated results. */
  onUsage?: (usage: AiUsage, attempt?: Readonly<AiAttempt>) => void | Promise<void>;
}
export interface AiCallOptions extends AiExecutionOptions {
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
  systemMessage?: string;
}
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RETRY_WAIT_MS = 10_000;
interface OpenAiChatResponse {
  model?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null; refusal?: string | null };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}
export class AiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Appel IA interrompu après ${timeoutMs}ms`);
    this.name = 'AiTimeoutError';
  }
}
export class AiCancelledError extends Error {
  constructor() {
    super('Génération IA annulée');
    this.name = 'AiCancelledError';
  }
}
export class AiProviderError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly retryAfterMs: number | undefined,
  ) {
    // Never copy raw provider errors, prompts, API keys or response bodies.
    super(`Erreur fournisseur IA HTTP ${status}`);
    this.name = 'AiProviderError';
  }
}
export class AiResponseError extends Error {
  constructor(public readonly reason: 'refusal' | 'truncated' | 'filtered' | 'protocol') {
    super(`Réponse IA non exploitable (${reason})`);
    this.name = 'AiResponseError';
  }
}
export class AiAccountingError extends Error {
  constructor() {
    super('Suivi de consommation IA indisponible');
    this.name = 'AiAccountingError';
  }
}
/** Conservative scope gate, not a medical diagnosis or exhaustive classifier. */
export function assertTrainingRequestSafe(input: {
  sport: string;
  goals: string;
  constraints?: string | undefined;
}): void {
  const text = `${input.sport} ${input.goals} ${input.constraints ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const medical =
    /douleur|blessur|entorse|fractur|operation|chirurg|enceint|grossesse|cardiaq|asthme|reeduc|rehabilit|tendinit|malaise|syncope|chest pain|injur|pregnan|surgery/;
  const hostile =
    /ignore.{0,30}(instruction|regle|consigne)|system prompt|developer message|contourn.{0,20}(securite|regle)|malgre.{0,20}douleur/;
  if (medical.test(text) || hostile.test(text)) {
    throw AppError.badRequest(
      'Alcide ne prépare pas de programme médical ou de rééducation. ' +
        'Pour une douleur, une blessure ou une situation médicale, demandez un avis professionnel ' +
        'avant de reprendre. Reformulez uniquement un objectif sportif général sans donnée de santé.',
    );
  }
}
export function assertTrainingContentSafe(content: unknown): void {
  const text = JSON.stringify(content)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (
    /charges? maximales?|\b1\s*rm\b|one.rep.max|malgre.{0,30}douleur|ignore.{0,20}douleur|sans recuperation|no pain no gain/.test(
      text,
    )
  ) {
    throw new AiResponseError('filtered');
  }
}
function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AiCancelledError();
}
/** The same conservative UTF-8 bound is used for preflight and actual admission. */
export function getAiInputTokensUpperBound(
  prompt: string,
  options: Pick<AiCallOptions, 'systemMessage' | 'jsonSchema'> = {},
): number {
  return (
    new TextEncoder().encode(
      (options.systemMessage ?? 'Réponds uniquement avec un objet JSON valide.') +
        prompt +
        (options.jsonSchema ? JSON.stringify(options.jsonSchema) : ''),
    ).byteLength + 256
  );
}

export async function callAiProvider(
  config: AiConfig,
  prompt: string,
  options: AiCallOptions = {},
): Promise<string> {
  const model = config.model ?? DEFAULT_OPENAI_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxCompletionTokens = options.maxTokens ?? 2048;
  const inputTokensUpperBound = getAiInputTokensUpperBound(prompt, options);
  const attempt = Object.freeze({
    receiptId: randomUUID(),
    model,
    maxCompletionTokens,
    inputTokensUpperBound,
  });
  throwIfCancelled(options.signal);
  // Every provider path must be reserved and measurable, including internal callers.
  if (!options.onAttempt || !options.onUsage) throw new AiAccountingError();
  try {
    await options.onAttempt(attempt);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AiAccountingError();
  }
  throwIfCancelled(options.signal);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await callOpenAi(config.apiKey, model, prompt, controller.signal, options, attempt);
  } catch (error) {
    if (options.signal?.aborted) throw new AiCancelledError();
    if (timedOut) throw new AiTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', cancel);
  }
}
function retryAfterMilliseconds(header: string | null | undefined): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  const milliseconds = Number.isFinite(seconds)
    ? Math.ceil(seconds * 1000)
    : Date.parse(header) - Date.now();
  return Number.isFinite(milliseconds) && milliseconds >= 0 ? milliseconds : undefined;
}
async function callOpenAi(
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
  options: AiCallOptions,
  attempt: Readonly<AiAttempt>,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'developer',
          content: options.systemMessage ?? 'Réponds uniquement avec un objet JSON valide.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_completion_tokens: attempt.maxCompletionTokens,
      response_format: options.jsonSchema
        ? { type: 'json_schema', json_schema: { ...options.jsonSchema, strict: true } }
        : { type: 'json_object' },
      store: false,
    }),
    signal,
  });
  if (!response.ok) {
    let errorCode: string | undefined;
    try {
      const body = (await response.json()) as { error?: { code?: string } };
      errorCode = body.error?.code;
    } catch {
      /* Non-JSON gateways: status remains authoritative. */
    }
    const quotaError = errorCode !== undefined && /quota|credit|spend|usage_limit/.test(errorCode);
    const retryable =
      !quotaError &&
      (response.status === 429 ||
        response.status === 408 ||
        response.status === 409 ||
        response.status >= 500);
    throw new AiProviderError(
      response.status,
      retryable,
      retryAfterMilliseconds(response.headers?.get('retry-after')),
    );
  }
  const data = (await response.json()) as OpenAiChatResponse;
  let accounted = false;
  if (data.usage && options.onUsage) {
    const { prompt_tokens: input, completion_tokens: output, total_tokens: total } = data.usage;
    if (
      typeof input === 'number' &&
      typeof output === 'number' &&
      typeof total === 'number' &&
      [input, output, total].every((value) => Number.isSafeInteger(value) && (value ?? -1) >= 0) &&
      total === input + output
    ) {
      try {
        const requestId = response.headers?.get('x-request-id');
        await options.onUsage(
          {
            ...(attempt.receiptId ? { receiptId: attempt.receiptId } : {}),
            model: data.model ?? model,
            inputTokens: input,
            outputTokens: output,
            totalTokens: total,
            ...(requestId ? { requestId } : {}),
          },
          attempt,
        );
        accounted = true;
      } catch {
        throw new AiAccountingError();
      }
    }
  }
  // Keep the admitted provision unresolved rather than accepting an unmeasured result.
  if (!accounted) throw new AiAccountingError();
  const choice = data.choices?.[0];
  if (choice?.message?.refusal) throw new AiResponseError('refusal');
  if (choice?.finish_reason === 'length') throw new AiResponseError('truncated');
  if (choice?.finish_reason === 'content_filter') throw new AiResponseError('filtered');
  if (
    choice?.finish_reason !== 'stop' ||
    typeof choice.message?.content !== 'string' ||
    !choice.message.content
  )
    throw new AiResponseError('protocol');
  return choice.message.content;
}
/** Respect server hints or stop: never truncate Retry-After and retry too soon. */
export async function waitForAiRetry(
  error: unknown,
  deadline: number,
  minimumAttemptBudgetMs: number,
  signal?: AbortSignal,
): Promise<boolean> {
  if (signal?.aborted) return false;
  if (
    error instanceof AiTimeoutError ||
    error instanceof AiCancelledError ||
    error instanceof AiResponseError ||
    error instanceof AiAccountingError ||
    error instanceof AppError
  )
    return false;
  if (error instanceof AiProviderError && !error.retryable) return false;
  const delayMs =
    error instanceof AiProviderError
      ? (error.retryAfterMs ?? 250 + Math.floor(Math.random() * 250))
      : 0;
  if (delayMs > MAX_RETRY_WAIT_MS || Date.now() + delayMs + minimumAttemptBudgetMs >= deadline)
    return false;
  if (delayMs > 0) {
    const completed = await new Promise<boolean>((resolve) => {
      const cancel = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        resolve(false);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', cancel);
        resolve(true);
      }, delayMs);
      signal?.addEventListener('abort', cancel, { once: true });
    });
    if (!completed) return false;
  }
  return !signal?.aborted;
}
