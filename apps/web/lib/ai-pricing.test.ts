import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPENAI_MODEL,
  estimateWorkoutGenerationCost,
  normalizeOpenAiModel,
} from './ai-pricing';

describe('tarification OpenAI', () => {
  it('normalise les modeles absents ou inconnus vers le modele par defaut', () => {
    expect(normalizeOpenAiModel()).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel(null)).toBe(DEFAULT_OPENAI_MODEL);
    expect(normalizeOpenAiModel('gpt-inconnu')).toBe(DEFAULT_OPENAI_MODEL);
  });

  it.each(['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5'] as const)(
    'conserve le modele supporte %s',
    (model) => {
      expect(normalizeOpenAiModel(model)).toBe(model);
    },
  );

  it('calcule et arrondit le cout estime du modele mini', () => {
    const estimate = estimateWorkoutGenerationCost('gpt-5.4-mini');

    expect(estimate).toEqual({
      modelId: 'gpt-5.4-mini',
      modelLabel: 'GPT-5.4 mini',
      inputTokens: 1_200,
      outputTokens: 1_800,
      totalUsd: 0.009,
      totalUsdLabel: '$0.009',
    });
  });

  it('repercute la difference de prix entre les modeles', () => {
    const standard = estimateWorkoutGenerationCost('gpt-5.4');
    const expert = estimateWorkoutGenerationCost('gpt-5.5');

    expect(expert.totalUsd).toBeGreaterThan(standard.totalUsd);
    expect(standard.modelLabel).toBe('GPT-5.4');
    expect(expert.modelLabel).toBe('GPT-5.5');
  });
});
