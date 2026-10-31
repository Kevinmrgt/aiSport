import { describe, expect, it, vi } from 'vitest';
import { PilotRepository } from '../src/repositories/pilot.repository.js';
import { PILOT_DURATION_MS } from '../src/services/pilot-policy.js';

vi.mock('../src/db/index.js', () => ({ db: {} }));

const review = {
  reviewer: 'unit-test',
  reviewReference: 'synthetic-clock-contract',
  legacyProvisionsReviewed: true as const,
  providerBalanceReviewed: true as const,
  allGenerationPathsReviewed: true as const,
  legacyNanoUsd: 0,
};

function fixture(at: unknown) {
  const empty = Object.assign(Promise.resolve([]), { limit: vi.fn().mockResolvedValue([]) });
  const values = vi.fn().mockResolvedValue(undefined);
  const tx = {
    execute: vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ at_ms: at }] }),
    select: () => ({ from: () => ({ where: () => empty, limit: () => Promise.resolve([]) }) }),
    insert: () => ({ values }),
  };
  const repository = new PilotRepository({
    transaction: async (work: (value: unknown) => Promise<void>) => work(tx),
  } as never);
  return { repository, values };
}

describe('persistent activation database clock contract', () => {
  it('accepts PostgreSQL epoch milliseconds text and derives both dates from that single reading', async () => {
    const milliseconds = '1793455234567';
    const { repository, values } = fixture(milliseconds);
    await repository.activate(review);
    expect(values).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        activatedAt: new Date(Number(milliseconds)),
        endsAt: new Date(Number(milliseconds) + PILOT_DURATION_MS),
      }),
    );
  });
  it.each([
    undefined,
    null,
    new Date(),
    1793455234567,
    '',
    '2026-10-31T12:00:00Z',
    '-1',
    '1.5',
    '99999999999999999',
  ])('fails closed on invalid epoch contract %s', async (value) => {
    const { repository, values } = fixture(value);
    await expect(repository.activate(review)).rejects.toMatchObject({ statusCode: 503 });
    expect(values).not.toHaveBeenCalled();
  });
});
