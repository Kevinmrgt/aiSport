import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/repositories/generation-quota.repository.js', () => ({
  getGenerationQuotaUsage: vi.fn(),
  reserveGenerationSlot: vi.fn(),
  releaseGenerationSlot: vi.fn(),
}));

import {
  getGenerationQuotaUsage,
  releaseGenerationSlot,
  reserveGenerationSlot,
} from '../src/repositories/generation-quota.repository.js';
import {
  getGenerationQuota,
  JURY_GENERATION_LIMIT,
  runWithGenerationQuota,
} from '../src/services/generation-quota.service.js';

describe('GenerationQuotaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('laisse les comptes Google illimites sans consulter le compteur', async () => {
    const quota = await getGenerationQuota('user-google', 'standard');

    expect(quota).toEqual({ limited: false, limit: null, used: 0, remaining: null });
    expect(getGenerationQuotaUsage).not.toHaveBeenCalled();
  });

  it('retourne le solde jury sur une enveloppe commune de 30 generations', async () => {
    vi.mocked(getGenerationQuotaUsage).mockResolvedValue(12);

    const quota = await getGenerationQuota('user-jury', 'jury');

    expect(getGenerationQuotaUsage).toHaveBeenCalledWith('user-jury', JURY_GENERATION_LIMIT);
    expect(quota).toEqual({ limited: true, limit: 30, used: 12, remaining: 18 });
  });

  it('reserve une unite avant l operation jury et conserve le debit en cas de succes', async () => {
    vi.mocked(reserveGenerationSlot).mockResolvedValue({ used: 30, remaining: 0 });
    const operation = vi.fn().mockResolvedValue('generation-ok');

    await expect(runWithGenerationQuota('user-jury', 'jury', operation)).resolves.toBe(
      'generation-ok',
    );

    expect(reserveGenerationSlot).toHaveBeenCalledWith('user-jury', 30);
    expect(operation).toHaveBeenCalledOnce();
    expect(releaseGenerationSlot).not.toHaveBeenCalled();
  });

  it('refuse la 31e generation avant tout appel IA', async () => {
    vi.mocked(reserveGenerationSlot).mockResolvedValue(null);
    const operation = vi.fn();

    await expect(runWithGenerationQuota('user-jury', 'jury', operation)).rejects.toMatchObject({
      statusCode: 429,
      code: 'GENERATION_QUOTA_EXCEEDED',
      details: { limit: 30, remaining: 0 },
    });
    expect(operation).not.toHaveBeenCalled();
  });

  it('recredite la reservation si la generation ou sa sauvegarde echoue', async () => {
    vi.mocked(reserveGenerationSlot).mockResolvedValue({ used: 4, remaining: 26 });
    vi.mocked(releaseGenerationSlot).mockResolvedValue(undefined);
    const failure = new Error('OpenAI indisponible');

    await expect(
      runWithGenerationQuota('user-jury', 'jury', () => Promise.reject(failure)),
    ).rejects.toBe(failure);

    expect(releaseGenerationSlot).toHaveBeenCalledWith('user-jury');
  });
});
