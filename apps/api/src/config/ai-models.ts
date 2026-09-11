import { z } from 'zod';

export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

export const AI_MODELS = [
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
  { id: 'gpt-5.4', label: 'GPT-5.4' },
  { id: 'gpt-5.5', label: 'GPT-5.5' },
] as const;

export const OpenAiModelSchema = z.enum(['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5']);

export type OpenAiModel = z.infer<typeof OpenAiModelSchema>;

export function normalizeOpenAiModel(model?: string | null): OpenAiModel {
  const parsed = OpenAiModelSchema.safeParse(model);
  return parsed.success ? parsed.data : DEFAULT_OPENAI_MODEL;
}
