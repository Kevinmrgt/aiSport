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
    });
  });

  // Exercices + repos
  exercises.forEach((ex, i) => {
    const duration = ex.duration_seconds ?? 60;
    blocks.push({
      id: `ex-${i}`,
      label: ex.name,
      sublabel: ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : `${duration}s`,
      seconds: duration,
      type: 'exercise',
    });
    if (ex.rest_seconds > 0) {
      blocks.push({
        id: `rest-${i}`,
        label: 'Repos',
        seconds: ex.rest_seconds,
        type: 'rest',
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
    });
  });

  return blocks;
}

const TYPE_STYLES: Record<TimelineBlock['type'], string> = {
  warmup: 'bg-amber-400',
  exercise: 'bg-primary-600',
  rest: 'bg-zinc-300',
  cooldown: 'bg-emerald-500',
};

const TYPE_TEXT: Record<TimelineBlock['type'], string> = {
  warmup: 'text-amber-900',
  exercise: 'text-white',
  rest: 'text-zinc-600',
  cooldown: 'text-emerald-900',
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

// RGAA 4.1: timeline accessible avec role=list et aria-labels
export function WorkoutTimeline({ exercises, warmup, cooldown }: WorkoutTimelineProps) {
  const blocks = buildBlocks(exercises, warmup, cooldown);
  const totalSeconds = blocks.reduce((acc, b) => acc + b.seconds, 0);

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
              <span className="text-zinc-600">{TYPE_LABELS[t]}</span>
            </div>
          ))}
        <span className="text-zinc-400 ml-auto">
          Total : {formatDuration(totalSeconds)}
        </span>
      </div>

      {/* Barre timeline */}
      <div
        className="flex h-10 rounded-lg overflow-hidden gap-px"
        role="img"
        aria-label={`Timeline de ${formatDuration(totalSeconds)}`}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`${TYPE_STYLES[block.type]} flex items-center justify-center overflow-hidden shrink-0 group relative`}
            style={{ width: `${(block.seconds / totalSeconds) * 100}%`, minWidth: '2px' }}
            title={`${block.label} — ${formatDuration(block.seconds)}`}
          >
            {(block.seconds / totalSeconds) > 0.06 && (
              <span className={`text-[10px] font-medium truncate px-1 ${TYPE_TEXT[block.type]}`}>
                {formatDuration(block.seconds)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Liste détaillée */}
      <ol className="space-y-2" aria-label="Détail des exercices">
        {blocks
          .filter((b) => b.type !== 'rest')
          .map((block) => (
            <li
              key={block.id}
              className="flex items-center gap-3 py-2 border-b border-zinc-100 last:border-0"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${TYPE_STYLES[block.type]}`}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {block.type !== 'warmup' && block.type !== 'cooldown' && (
                    <span className="text-zinc-400 font-normal mr-1">
                      {blocks.filter((b) => b.type === 'exercise').indexOf(block) + 1}.
                    </span>
                  )}
                  {block.label}
                  {block.sublabel && (
                    <span className="ml-2 text-xs text-zinc-400">{block.sublabel}</span>
                  )}
                </p>
              </div>
              <span className="text-xs text-zinc-400 shrink-0">
                {formatDuration(block.seconds)}
              </span>
            </li>
          ))}
      </ol>
    </div>
  );
}
