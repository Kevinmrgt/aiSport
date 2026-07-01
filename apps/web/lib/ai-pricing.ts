export type OpenAiModelId = 'gpt-5.4-mini' | 'gpt-5.4' | 'gpt-5.5';

type ModelPricing = {
  label: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

export const DEFAULT_OPENAI_MODEL: OpenAiModelId = 'gpt-5.4-mini';

export const WORKOUT_TOKEN_ESTIMATE = {
  inputTokens: 1_200,
  outputTokens: 1_800,
} as const;

export const OPENAI_MODEL_PRICING: Record<OpenAiModelId, ModelPricing> = {
  'gpt-5.4-mini': {
    label: 'GPT-5.4 mini',
    inputUsdPerMillion: 0.75,
    outputUsdPerMillion: 4.5,
  },
  'gpt-5.4': {
    label: 'GPT-5.4',
    inputUsdPerMillion: 2.5,
    outputUsdPerMillion: 15,
  },
  'gpt-5.5': {
    label: 'GPT-5.5',
    inputUsdPerMillion: 5,
    outputUsdPerMillion: 30,
  },
};

export function normalizeOpenAiModel(model?: string | null): OpenAiModelId {
  return model && model in OPENAI_MODEL_PRICING ? (model as OpenAiModelId) : DEFAULT_OPENAI_MODEL;
}

export function estimateWorkoutGenerationCost(model?: string | null) {
  const modelId = normalizeOpenAiModel(model);
  const pricing = OPENAI_MODEL_PRICING[modelId];
  const inputCost =
    (WORKOUT_TOKEN_ESTIMATE.inputTokens / 1_000_000) * pricing.inputUsdPerMillion;
  const outputCost =
    (WORKOUT_TOKEN_ESTIMATE.outputTokens / 1_000_000) * pricing.outputUsdPerMillion;
  const totalUsd = inputCost + outputCost;

  return {
    modelId,
    modelLabel: pricing.label,
    inputTokens: WORKOUT_TOKEN_ESTIMATE.inputTokens,
    outputTokens: WORKOUT_TOKEN_ESTIMATE.outputTokens,
    totalUsd,
    totalUsdLabel: `$${totalUsd.toFixed(3)}`,
  };
}
