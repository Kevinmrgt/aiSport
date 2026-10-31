import { AppError } from '../types/app-error.js';

export const PILOT_CAP_NANO_USD = 20_000_000_000;
export const PILOT_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const PILOT_MODELS = ['gpt-5.4-mini', 'gpt-5.4-mini-2026-03-17'] as const;

/** $0.75/$4.50 per million tokens, plus a conservative 10% region provision. */
export function pilotPrice(model: string): { input: number; output: number } {
  if (!(PILOT_MODELS as readonly string[]).includes(model))
    throw AppError.serviceUnavailable('Tarif IA inconnu : generation refusee');
  return { input: 825, output: 4950 };
}

export function pilotCost(
  input: number,
  output: number,
  price: { input: number; output: number },
): number {
  const amount = input * price.input + output * price.output;
  if (
    !Number.isSafeInteger(input) ||
    input < 0 ||
    !Number.isSafeInteger(output) ||
    output < 0 ||
    !Number.isSafeInteger(amount) ||
    amount < 0
  )
    throw AppError.serviceUnavailable('Montant IA invalide');
  return amount;
}

export function validatePilotInput(kind: 'workout' | 'program', input: unknown): void {
  if (kind !== 'program') return;
  const candidate = input as { weeks_count?: unknown; sessions_per_week?: unknown } | null;
  if (
    !candidate ||
    !Number.isInteger(candidate.weeks_count) ||
    Number(candidate.weeks_count) < 1 ||
    Number(candidate.weeks_count) > 2 ||
    !Number.isInteger(candidate.sessions_per_week) ||
    Number(candidate.sessions_per_week) < 1 ||
    Number(candidate.sessions_per_week) > 5
  )
    throw AppError.badRequest(
      'Le pilote accepte au maximum deux semaines et cinq seances par semaine',
    );
}
