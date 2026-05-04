import type { Exercise, Phase } from '@sportcoach/shared';

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

  // Échauffement
  (warmup ?? []).forEach((p, i) => {
    blocks.push({
      id: `warmup-${i}`,
      label: p.name,
      seconds: p.duration_seconds,
      type: 'warmup',
      isTimed: true,
    });
  });

  // Exercices + repos
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

  // Récupération
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
  warmup: 'bg-orange-300',
  exercise: 'bg-primary-300',
  rest: 'bg-white/20',
  cooldown: 'bg-emerald-300',
};

const TYPE_TEXT: Record<TimelineBlock['type'], string> = {
  warmup: 'text-zinc-950',
  exercise: 'text-zinc-950',
  rest: 'text-zinc-200',
  cooldown: 'text-zinc-950',
};

const TYPE_LABELS: Record<TimelineBlock['type'], string> = {
  warmup: 'Échauffement',
  exercise: 'Exercice',
  rest: 'Repos',
  cooldown: 'Récupération',
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
  if (!block.isTimed || totalTimedSeconds === 0) return '0%';
  return `${(block.seconds / totalTimedSeconds) * 100}%`;
}

// RGAA 4.1: timeline accessible avec role=list et aria-labels
export function WorkoutTimeline({ exercises, warmup, cooldown }: WorkoutTimelineProps) {
  const blocks = buildBlocks(exercises, warmup, cooldown);
  const totalTimedSeconds = blocks.reduce((acc, b) => acc + b.seconds, 0);
  const totalLabel = totalTimedSeconds > 0 ? formatDuration(totalTimedSeconds) : 'aucun chrono';
  const exerciseBlocks = blocks.filter((b) => b.type === 'exercise');

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-xs" aria-label="Légende de la timeline">
        {(['warmup', 'exercise', 'rest', 'cooldown'] as const)
          .filter((t) => blocks.some((b) => b.type === t))
          .map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-sm ${TYPE_STYLES[t]}`} aria-hidden="true" />
              <span className="text-zinc-400">{TYPE_LABELS[t]}</span>
            </div>
          ))}
        <span className="w-full text-primary-300 sm:ml-auto sm:w-auto">
          Total chrono : {totalLabel}
        </span>
      </div>

      {/* Barre timeline */}
      <div
        className="flex h-12 overflow-hidden rounded-lg border border-white/10 bg-zinc-950 gap-px"
        role="img"
        aria-label={`Timeline de ${totalLabel}`}
      >
        {blocks.map((block) => {
          const ratio = totalTimedSeconds > 0 ? block.seconds / totalTimedSeconds : 0;

          return (
            <div
              key={block.id}
              className={`${TYPE_STYLES[block.type]} flex items-center justify-center overflow-hidden shrink-0 group relative`}
              style={{ width: getBlockWidth(block, totalTimedSeconds), minWidth: block.isTimed ? '2px' : '10px' }}
              title={`${block.label} — ${block.isTimed ? formatDuration(block.seconds) : 'libre'}`}
            >
              {ratio > 0.06 && (
                <span className={`text-[10px] font-medium truncate px-1 ${TYPE_TEXT[block.type]}`}>
                  {formatDuration(block.seconds)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Liste détaillée */}
      <ol className="space-y-2" aria-label="Détail des exercices">
        {blocks
          .filter((b) => b.type !== 'rest')
          .map((block) => (
            <li
              key={block.id}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-zinc-950/60 p-3"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${TYPE_STYLES[block.type]}`}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="break-words text-sm font-bold text-white">
                  {block.type === 'exercise' && (
                    <span className="mr-1 font-normal text-zinc-400">
                      {exerciseBlocks.indexOf(block) + 1}.
                    </span>
                  )}
                  {block.label}
                  {block.sublabel && (
                    <span className="ml-2 text-xs text-zinc-400">{block.sublabel}</span>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-primary-300">
                {block.isTimed ? formatDuration(block.seconds) : 'Libre'}
              </span>
            </li>
          ))}
      </ol>
    </div>
  );
}
