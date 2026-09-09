import type { Exercise, Phase } from '@alcide/shared';
import { Icon } from './ui/Icon';

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
  description?: string;
  tips?: string;
  restSeconds?: number;
}

function buildBlocks(exercises: Exercise[], warmup?: Phase[], cooldown?: Phase[]): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  (warmup ?? []).forEach((p, i) => {
    blocks.push({
      id: `warmup-${i}`,
      label: p.name,
      description: p.description,
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
      description: ex.description,
      tips: ex.tips,
      restSeconds: ex.rest_seconds,
      sublabel:
        ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : isTimed ? formatDuration(duration) : 'Libre',
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
      description: p.description,
      seconds: p.duration_seconds,
      type: 'cooldown',
      isTimed: true,
    });
  });

  return blocks;
}

const TYPE_STYLES: Record<TimelineBlock['type'], string> = {
  warmup: 'bg-primary-500',
  exercise: 'bg-primary-300',
  rest: 'bg-white/25',
  cooldown: 'bg-primary-100',
};

const TYPE_LABELS: Record<TimelineBlock['type'], string> = {
  warmup: 'Échauffement',
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
      <div
        className="flex flex-wrap items-center gap-3 text-xs"
        aria-label="Legende de la timeline"
      >
        {(['warmup', 'exercise', 'rest', 'cooldown'] as const)
          .filter((t) => blocks.some((b) => b.type === t))
          .map((t) => (
            <span key={t} className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${TYPE_STYLES[t]}`} aria-hidden="true" />
              {TYPE_LABELS[t]}
            </span>
          ))}
        <span className="ml-auto text-primary-200">Total chrono : {totalLabel}</span>
      </div>
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`Timeline de ${totalLabel}`}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`${TYPE_STYLES[block.type]} min-w-0`}
            style={{ flexBasis: getBlockWidth(block, totalTimedSeconds), flexShrink: 1 }}
            title={`${block.label} - ${block.isTimed ? formatDuration(block.seconds) : 'libre'}`}
          />
        ))}
      </div>
      <ol className="space-y-3" aria-label="Detail des exercices">
        {blocks
          .filter((b) => b.type !== 'rest')
          .map((block) => (
            <li key={block.id}>
              <details
                className="timeline-block"
                open={block.type === 'exercise' && exerciseBlocks.indexOf(block) === 0}
              >
                <summary>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${TYPE_STYLES[block.type]}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-xs text-primary-200">
                      {TYPE_LABELS[block.type]}
                      {block.type === 'exercise' ? ` ${exerciseBlocks.indexOf(block) + 1}` : ''}
                    </span>
                    <span className="mt-1 block break-words font-bold">{block.label}</span>
                  </span>
                  <span className="shrink-0 text-sm">
                    {block.isTimed ? formatDuration(block.seconds) : 'Libre'}
                  </span>
                  <Icon name="plus" className="timeline-toggle h-5 w-5 shrink-0" />
                </summary>
                <div className="mt-4 space-y-3 border-t border-white/15 pt-4">
                  {block.sublabel && (
                    <p className="font-semibold text-primary-200">{block.sublabel}</p>
                  )}
                  {block.description && <p className="muted-copy">{block.description}</p>}
                  {block.tips && (
                    <p className="muted-copy text-sm">
                      <strong>Conseil :</strong> {block.tips}
                    </p>
                  )}
                  {Boolean(block.restSeconds) && (
                    <p className="text-sm text-primary-200">
                      Repos : {formatDuration(block.restSeconds!)}
                    </p>
                  )}
                </div>
              </details>
            </li>
          ))}
      </ol>
    </div>
  );
}
