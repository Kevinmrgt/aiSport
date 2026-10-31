import { AppError } from '../types/app-error.js';
import { PILOT_MODELS } from './pilot-policy.js';

export interface GenerationPolicy {
  enabled: boolean;
  userDailyAttempts: number;
  globalDailyAttempts: number;
  userDailyTokens: number;
  globalDailyTokens: number;
  userConcurrency: number;
  globalConcurrency: number;
  leaseSeconds: number;
  inputTokensPerAttempt: number;
  maxCompletionTokens: number;
  allowedModels: string[];
  defaultModel: string;
}

function positiveInteger(name: string, fallback: number, maximum = 10_000_000): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(raw))
    throw AppError.serviceUnavailable(`Configuration de generation invalide (${name})`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > maximum)
    throw AppError.serviceUnavailable(`Configuration de generation invalide (${name})`);
  return value;
}

export function generationPolicy(): GenerationPolicy {
  const enabled = process.env['AI_GENERATION_ENABLED'] ?? 'true';
  if (!['true', 'false'].includes(enabled))
    throw AppError.serviceUnavailable('Configuration de generation invalide');
  const allowedModels = [
    ...new Set(
      (process.env['AI_ALLOWED_MODELS'] ?? 'gpt-5.4-mini').split(',').map((value) => value.trim()),
    ),
  ];
  const defaultModel = process.env['AI_DEFAULT_MODEL'] ?? 'gpt-5.4-mini';
  if (
    allowedModels.length === 0 ||
    allowedModels.length > 8 ||
    allowedModels.some((model) => !(PILOT_MODELS as readonly string[]).includes(model)) ||
    !allowedModels.includes(defaultModel)
  ) {
    throw AppError.serviceUnavailable('Politique de modeles IA invalide');
  }
  const leaseSeconds = positiveInteger('AI_GENERATION_LEASE_SECONDS', 120, 300);
  if (leaseSeconds < 90)
    throw AppError.serviceUnavailable(
      'La duree de reservation doit couvrir le delai maximal de generation',
    );
  return {
    enabled: enabled === 'true',
    userDailyAttempts: positiveInteger('AI_USER_DAILY_ATTEMPTS', 16),
    globalDailyAttempts: positiveInteger('AI_GLOBAL_DAILY_ATTEMPTS', 200),
    userDailyTokens: positiveInteger('AI_USER_DAILY_TOKENS', 160_000),
    globalDailyTokens: positiveInteger('AI_GLOBAL_DAILY_TOKENS', 2_000_000),
    userConcurrency: positiveInteger('AI_USER_CONCURRENCY', 1, 50),
    globalConcurrency: positiveInteger('AI_GLOBAL_CONCURRENCY', 4, 100),
    leaseSeconds,
    inputTokensPerAttempt: positiveInteger('AI_RESERVED_INPUT_TOKENS', 16_384, 100_000),
    maxCompletionTokens: positiveInteger('AI_MAX_COMPLETION_TOKENS', 11000, 16_384),
    allowedModels,
    defaultModel,
  };
}
