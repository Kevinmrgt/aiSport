import type { Exercise, Phase } from '@alcide/shared';

interface WorkoutTimelineProps {
  exercises: Exercise[];
  warmup?: Phase[];
  cooldown?: Phase[];
}

interface TimelineBlock {
  id: string;
  label: string;
  sublabel?: string;
  seconds: number;
  type: 'warmup' | 'exercise' | 'rest' | 'cooldown';
  isTimed: boolean;
}

function buildBlocks(
  exercises: Exercise[],
  warmup?: Phase[],
  cooldown?: Phase[],
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  (warmup ?? []).forEach((p, i) => {
    blocks.push({
      id: `warmup-${i}`,
      label: p.name,
      seconds: p.duration_seconds,
      type: 'warmup',
      isTimed: true,
    });
  });

  exercises.forEach((ex, i) => {
    const isTimed = ex.duration_seconds != null;
    const duration = ex.duration_seconds ?? 0;
    blocks.push({
      id: `ex-${i}`,
      label: ex.name,
      sublabel: ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : isTimed ? formatDuration(duration) : 'Libre',
      seconds: duration,
      type: 'exercise',
      isTimed,
    });
    if (ex.rest_seconds > 0) {
      blocks.push({
        id: `rest-${i}`,
        label: 'Repos',
        seconds: ex.rest_seconds,
        type: 'rest',
        isTimed: true,
      });
    }
  });

  (cooldown ?? []).forEach((p, i) => {
    blocks.push({
      id: `cooldown-${i}`,
      label: p.name,
      seconds: p.duration_seconds,
      type: 'cooldown',
      isTimed: true,
    });
  });

  return blocks;
}

const TYPE_STYLES: Record<TimelineBlock['type'], string> = {
  warmup: 'bg-sport-orange',
  exercise: 'bg-primary-300',
  rest: 'bg-white/25',
  cooldown: 'bg-primary-100',
};

const TYPE_LABELS: Record<TimelineBlock['type'], string> = {
  warmup: 'Echauffement',
  exercise: 'Exercice',
  rest: 'Repos',
  cooldown: 'Retour calme',
};

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m${s}s` : `${m}min`;
  }
  return `${seconds}s`;
}

function getBlockWidth(block: TimelineBlock, totalTimedSeconds: number): string {
  if (!block.isTimed || totalTimedSeconds === 0) return '2%';
  return `${Math.max(2, (block.seconds / totalTimedSeconds) * 100)}%`;
}

export function WorkoutTimeline({ exercises, warmup, cooldown }: WorkoutTimelineProps) {
  const blocks = buildBlocks(exercises, warmup, cooldown);
  const totalTimedSeconds = blocks.reduce((acc, b) => acc + b.seconds, 0);
  const totalLabel = totalTimedSeconds > 0 ? formatDuration(totalTimedSeconds) : 'aucun chrono';
  const exerciseBlocks = blocks.filter((b) => b.type === 'exercise');

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-xs" aria-label="Legende de la timeline">
        {(['warmup', 'exercise', 'rest', 'cooldown'] as const)
          .filter((t) => blocks.some((b) => b.type === t))
          .map((t) => (
            <div key={t} className="premium-chip">
              <span className={`inline-block h-3 w-3 rounded-full ${TYPE_STYLES[t]}`} aria-hidden="true" />
              <span>{TYPE_LABELS[t]}</span>
            </div>
          ))}
        <span className="premium-chip ml-auto text-primary-200">Total chrono : {totalLabel}</span>
      </div>

      <div
        className="flex h-14 overflow-hidden rounded-full border border-white/10 bg-zinc-950/60 p-1 shadow-inner shadow-black/30"
        role="img"
        aria-label={`Timeline de ${totalLabel}`}
      >
        {blocks.map((block) => {
          const ratio = totalTimedSeconds > 0 ? block.seconds / totalTimedSeconds : 0;

          return (
            <div
              key={block.id}
              className={`${TYPE_STYLES[block.type]} relative flex shrink-0 items-center justify-center overflow-hidden first:rounded-l-full last:rounded-r-full`}
              style={{ width: getBlockWidth(block, totalTimedSeconds) }}
              title={`${block.label} - ${block.isTimed ? formatDuration(block.seconds) : 'libre'}`}
            >
              {ratio > 0.08 && (
                <span className="truncate px-1 text-[10px] font-black text-zinc-950">
                  {formatDuration(block.seconds)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ol className="grid gap-3" aria-label="Detail des exercices">
        {blocks
          .filter((b) => b.type !== 'rest')
          .map((block) => (
            <li
              key={block.id}
              className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-zinc-950/[0.45] p-3"
            >
              <span className={`h-3 w-3 shrink-0 rounded-full ${TYPE_STYLES[block.type]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-black text-white">
                  {block.type === 'exercise' && (
                    <span className="mr-1 font-normal text-zinc-400">
                      {exerciseBlocks.indexOf(block) + 1}.
                    </span>
                  )}
                  {block.label}
                </p>
                {block.sublabel && (
                  <p className="mt-0.5 text-xs font-semibold text-zinc-400">{block.sublabel}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-black text-primary-300">
                {block.isTimed ? formatDuration(block.seconds) : 'Libre'}
              </span>
            </li>
          ))}
      </ol>
    </div>
  );
}
