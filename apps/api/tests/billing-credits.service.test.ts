import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/repositories/billing.repository.js', () => ({
  reserveCredits: vi.fn(),
  releaseCredits: vi.fn(),
  persistWithCredits: vi.fn(),
}));
import {
  reserveCredits,
  releaseCredits,
  persistWithCredits,
} from '../src/repositories/billing.repository.js';
import { withBillingCredits } from '../src/services/billing-credits.service.js';

describe('crédits de génération', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(reserveCredits).mockResolvedValue('reservation');
  });
  it('réserve toutes les semaines avant tout appel IA et confirme lors de la sauvegarde', async () => {
    vi.mocked(persistWithCredits).mockResolvedValue('saved');
    const save = vi.fn();
    expect(await withBillingCredits('user', 4, async (persist) => persist!(save))).toBe('saved');
    expect(reserveCredits).toHaveBeenCalledWith('user', 4);
    expect(persistWithCredits).toHaveBeenCalledWith('user', 'reservation', save);
    expect(releaseCredits).not.toHaveBeenCalled();
  });
  it('n’appelle pas l’IA si le solde est insuffisant', async () => {
    vi.mocked(reserveCredits).mockRejectedValue(new Error('insufficient'));
    const operation = vi.fn();
    await expect(withBillingCredits('user', 4, operation)).rejects.toThrow('insufficient');
    expect(operation).not.toHaveBeenCalled();
  });
  it('restitue les crédits de la réservation si la génération échoue', async () => {
    await expect(
      withBillingCredits('user', 1, () => Promise.reject(new Error('AI'))),
    ).rejects.toThrow('AI');
    expect(releaseCredits).toHaveBeenCalledWith('user', 'reservation');
  });
  it('restitue les crédits si la sauvegarde atomique échoue', async () => {
    vi.mocked(persistWithCredits).mockRejectedValue(new Error('DB'));
    await expect(
      withBillingCredits('user', 1, async (persist) => persist!(vi.fn())),
    ).rejects.toThrow('DB');
    expect(releaseCredits).toHaveBeenCalledOnce();
  });
});
