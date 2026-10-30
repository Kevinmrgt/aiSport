import { describe, it, expect } from 'vitest';
import {
  AdminQuerySchema,
  AdminGrantSchema,
  AdminSuspensionSchema,
  AdminBetaAdjustmentSchema,
} from '../src/admin.js';
describe('contrats administration', () => {
  it('normalise les filtres et conserve les valeurs utiles', () =>
    expect(AdminQuerySchema.parse({ q: '  Élodie  ', page: '2', beta: 'present' })).toEqual({
      q: 'Élodie',
      page: 2,
      beta: 'present',
    }));
  it.each([
    { page: 0 },
    { page: '2.5' },
    { from: '2026-02-30' },
    { from: '2026-10-01', to: '2026-09-01' },
    { subscription: 'invented' },
    { userId: 'other' },
  ])('refuse les filtres invalides %j', (input) =>
    expect(AdminQuerySchema.safeParse(input).success).toBe(false),
  );
  it('exige un motif et une référence pour offrir des crédits', () => {
    expect(AdminGrantSchema.safeParse({ amount: 5, reason: 'Test' }).success).toBe(false);
    expect(AdminSuspensionSchema.safeParse({ suspended: true, reason: ' ' }).success).toBe(false);
    expect(AdminBetaAdjustmentSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
});
