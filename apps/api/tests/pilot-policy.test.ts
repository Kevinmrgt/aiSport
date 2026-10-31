import { describe, expect, it } from 'vitest';
import {
  pilotCost,
  pilotPrice,
  validatePilotInput,
  PILOT_CAP_NANO_USD,
} from '../src/services/pilot-policy.js';

describe('fixed pilot policy', () => {
  it('prices every supported alias in exact nanoUSD with a 10% regional provision', () => {
    expect(pilotPrice('gpt-5.4-mini')).toEqual({ input: 825, output: 4950 });
    expect(pilotPrice('gpt-5.4-mini-2026-03-17')).toEqual(pilotPrice('gpt-5.4-mini'));
    expect(pilotCost(1_000_000, 1_000_000, pilotPrice('gpt-5.4-mini'))).toBe(5_775_000_000);
    expect(PILOT_CAP_NANO_USD).toBe(20_000_000_000);
    expect(() => pilotPrice('gpt-unknown')).toThrow();
  });
  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER, 0.5])(
    'rejects unaccountable token amounts %s',
    (value) => {
      expect(() => pilotCost(value, 0, pilotPrice('gpt-5.4-mini'))).toThrow();
    },
  );
  it('validates program scope before consuming any admission', () => {
    expect(() =>
      validatePilotInput('program', { weeks_count: 2, sessions_per_week: 5 }),
    ).not.toThrow();
    for (const input of [
      { weeks_count: 3, sessions_per_week: 5 },
      { weeks_count: 2, sessions_per_week: 6 },
      {},
      null,
    ])
      expect(() => validatePilotInput('program', input)).toThrow();
  });
});
