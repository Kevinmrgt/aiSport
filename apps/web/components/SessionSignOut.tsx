'use client';

import { Icon } from './ui/Icon';
import { clearTimerProgress } from '@/lib/timer-storage';

export function SessionSignOut({ action }: { action: () => Promise<void> }) {
  return (
    <form className="ml-auto" action={action} onSubmit={clearTimerProgress}>
      <button
        type="submit"
        aria-label="Se deconnecter"
        className="group flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.06] hover:text-white"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-zinc-200 transition group-hover:bg-sport-orange group-hover:text-zinc-950">
          <Icon name="log-out" className="h-3.5 w-3.5" />
        </span>
        <span className="hidden xl:block">Sortir</span>
      </button>
    </form>
  );
}
