import { getSessionTiming } from '@alcide/shared';
import type { ProgramSession } from '@alcide/shared';

/** Read-only duration calculation for both saved legacy sessions and version 2. */
export function getProgramSessionTimedSeconds(session: ProgramSession): number {
  return getSessionTiming(session.exercises, session.warmup, session.cooldown).timedSeconds;
}
