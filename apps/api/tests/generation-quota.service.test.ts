import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/repositories/billing.repository.js', () => ({
  readBillingStatus: vi.fn().mockResolvedValue({plan:'free',remaining:3,periodEnd:null}),
}));

vi.mock('../src/repositories/generation-quota.repository.js', () => ({
  getGenerationQuotaUsage: vi.fn(),
  reserveGenerationSlot: vi.fn(),
  releaseGenerationSlot: vi.fn(),
}));
vi.mock('../src/services/beta-tester.service.js', () => ({
  reserveBetaSlot: vi.fn(),
  releaseBetaSlot: vi.fn(),
}));

import {
  getGenerationQuotaUsage,
  releaseGenerationSlot,
  reserveGenerationSlot,
} from '../src/repositories/generation-quota.repository.js';
import { releaseBetaSlot, reserveBetaSlot } from '../src/services/beta-tester.service.js';
import {
  getGenerationQuota,
  JURY_GENERATION_LIMIT,
  runWithGenerationQuota,
} from '../src/services/generation-quota.service.js';

describe('GenerationQuotaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applique le solde freemium aux comptes Google sans modifier le compteur jury', async () => {
    const quota = await getGenerationQuota('user-google', 'standard');

    expect(quota).toEqual({ mode:'standard',limited:true,limit:null,used:0,remaining:3,plan:'free',periodEnd:null });
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

  it('débite atomiquement un crédit bêta et le rend si la génération échoue', async () => {
    vi.mocked(reserveBetaSlot).mockResolvedValue({ remaining: 2 } as never);
    vi.mocked(releaseBetaSlot).mockResolvedValue(undefined);
    await expect(runWithGenerationQuota('user-beta', 'beta', () => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(reserveBetaSlot).toHaveBeenCalledWith('user-beta');

    await expect(
      runWithGenerationQuota('user-beta', 'beta', async () => Promise.reject(new Error('IA indisponible'))),
    ).rejects.toThrow('IA indisponible');
    expect(releaseBetaSlot).toHaveBeenCalledWith('user-beta');
  });

  it('refuse une génération bêta sans crédit avant l appel IA', async () => {
    vi.mocked(reserveBetaSlot).mockResolvedValue(null);
    const operation = vi.fn();
    await expect(runWithGenerationQuota('user-beta', 'beta', operation)).rejects.toMatchObject({
      code: 'GENERATION_QUOTA_EXCEEDED',
      details: { remaining: 0 },
    });
    expect(operation).not.toHaveBeenCalled();
  });
});
