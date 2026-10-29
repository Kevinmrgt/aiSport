export const TIMER_STORAGE_KEY = 'alcide.timer.v1';
const TTL_MS = 12 * 60 * 60 * 1000;

export interface TimerProgress {
  version: 1;
  scope: string;
  signature: string;
  savedAt: number;
  index: number;
  secondsLeft: number | null;
  activeMs: number;
}

export function timerSignature(path: string, durations: Array<number | null>): string {
  // Store no resource IDs, exercise text, notes or provider identity.
  const input = `${path}:${JSON.stringify(durations)}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++)
    hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
}

export function clearTimerProgress(): void {
  try {
    sessionStorage.removeItem(TIMER_STORAGE_KEY);
  } catch {
    /* Optional browser storage. */
  }
}

export function readTimerProgress(
  scope: string,
  signature: string,
  durations: Array<number | null>,
  now = Date.now(),
): TimerProgress | null {
  try {
    const raw = sessionStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    if (raw.length > 1024) {
      clearTimerProgress();
      return null;
    }
    const saved = JSON.parse(raw) as Partial<TimerProgress>;
    const index = saved.index;
    const duration = typeof index === 'number' ? durations[index] : undefined;
    if (
      !scope ||
      saved.version !== 1 ||
      saved.scope !== scope ||
      saved.signature !== signature ||
      !Number.isInteger(index) ||
      index === undefined ||
      index < 0 ||
      duration === undefined ||
      typeof saved.savedAt !== 'number' ||
      saved.savedAt > now + 60_000 ||
      now - saved.savedAt > TTL_MS ||
      typeof saved.activeMs !== 'number' ||
      !Number.isFinite(saved.activeMs) ||
      saved.activeMs < 0 ||
      saved.activeMs > 24 * 60 * 60 * 1000 ||
      (duration === null
        ? saved.secondsLeft !== null
        : typeof saved.secondsLeft !== 'number' ||
          !Number.isInteger(saved.secondsLeft) ||
          saved.secondsLeft < 0 ||
          saved.secondsLeft > duration)
    ) {
      clearTimerProgress();
      return null;
    }
    return saved as TimerProgress;
  } catch {
    clearTimerProgress();
    return null;
  }
}

export function writeTimerProgress(progress: TimerProgress): void {
  if (!progress.scope) return;
  try {
    sessionStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* Timer works without storage. */
  }
}
