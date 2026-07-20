'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise, Phase } from '@alcide/shared';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { ProgressRing } from './PremiumPrimitives';
import {
  SessionCompletionForm,
  type SessionCompletionPayload,
  type TimerSessionMeta,
} from './SessionCompletionForm';

export type { SessionCompletionPayload, TimerSessionMeta } from './SessionCompletionForm';

export interface TimerProps {
  exercises: Exercise[];
  warmup?: Phase[];
  cooldown?: Phase[];
  completeAction?: (payload: SessionCompletionPayload) => Promise<{ error?: string } | void>;
  sessionMeta?: TimerSessionMeta;
}

type TimerStepType = 'warmup' | 'exercise' | 'rest' | 'cooldown';

interface TimerStep {
  id: string;
  type: TimerStepType;
  title: string;
  description?: string;
  durationSeconds: number | null;
  exerciseIndex?: number;
  tips?: string;
}

function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    return ctxRef.current;
  }, []);

  const beep = useCallback(
    (frequency = 880, duration = 0.1, volume = 0.3, delayMs = 0) => {
      try {
        const ctx = getCtx();
        const play = () => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = frequency;
          osc.type = 'sine';
          gain.gain.setValueAtTime(volume, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + duration);
        };
        if (delayMs > 0) setTimeout(play, delayMs);
        else play();
      } catch {
        // Audio unavailable in the current browser context.
      }
    },
    [getCtx],
  );

  const playCountdown = useCallback(() => beep(880, 0.08, 0.2), [beep]);

  const playPhaseChange = useCallback(() => {
    beep(660, 0.12, 0.3);
    beep(880, 0.12, 0.3, 200);
  }, [beep]);

  const playComplete = useCallback(() => {
    beep(660, 0.15, 0.4);
    beep(880, 0.15, 0.4, 200);
    beep(1100, 0.3, 0.4, 400);
  }, [beep]);

  return { playCountdown, playPhaseChange, playComplete };
}

export function buildTimerSteps(
  exercises: Exercise[],
  warmup: Phase[] = [],
  cooldown: Phase[] = [],
): TimerStep[] {
  const steps: TimerStep[] = [];

  warmup.forEach((phase, index) => {
    steps.push({
      id: `warmup-${index}`,
      type: 'warmup',
      title: phase.name,
      description: phase.description,
      durationSeconds: phase.duration_seconds,
    });
  });

  exercises.forEach((exercise, index) => {
    steps.push({
      id: `exercise-${index}`,
      type: 'exercise',
      title: exercise.name,
      description: exercise.description,
      durationSeconds: exercise.duration_seconds ?? null,
      exerciseIndex: index,
      tips: exercise.tips,
    });

    if (exercise.rest_seconds > 0) {
      steps.push({
        id: `rest-${index}`,
        type: 'rest',
        title: 'Recuperation',
        description:
          index < exercises.length - 1
            ? `Avant ${exercises[index + 1]?.name ?? "l'exercice suivant"}`
            : 'Dernier temps de repos',
        durationSeconds: exercise.rest_seconds,
        exerciseIndex: index,
      });
    }
  });

  cooldown.forEach((phase, index) => {
    steps.push({
      id: `cooldown-${index}`,
      type: 'cooldown',
      title: phase.name,
      description: phase.description,
      durationSeconds: phase.duration_seconds,
    });
  });

  return steps;
}

function formatTime(totalSeconds: number): string {
  const clampedSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(clampedSeconds / 60);
  const seconds = clampedSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getStepLabel(step: TimerStep): string {
  if (step.type === 'warmup') return 'ECHAUFFEMENT';
  if (step.type === 'rest') return 'REPOS';
  if (step.type === 'cooldown') return 'RETOUR CALME';
  return 'EXERCICE';
}

function getProgressLabel(step: TimerStep, exercisesCount: number): string {
  if (step.type === 'exercise' && step.exerciseIndex != null) {
    return `Exercice ${step.exerciseIndex + 1} sur ${exercisesCount}`;
  }

  if (step.type === 'rest' && step.exerciseIndex != null) {
    return `Repos apres l'exercice ${step.exerciseIndex + 1} sur ${exercisesCount}`;
  }

  return step.type === 'warmup' ? 'Echauffement' : 'Retour calme';
}

export function Timer({ exercises, warmup, cooldown, completeAction, sessionMeta }: TimerProps) {
  const steps = useMemo(
    () => buildTimerSteps(exercises, warmup, cooldown),
    [exercises, warmup, cooldown],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(steps[0]?.durationSeconds ?? null);
  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(steps.length === 0);
  const [completedDurationSeconds, setCompletedDurationSeconds] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerContainerRef = useRef<HTMLElement | null>(null);
  const nativeFullscreenActiveRef = useRef(false);
  const stepDeadlineRef = useRef<number | null>(null);
  const activeStartedAtRef = useRef<number | null>(null);
  const accumulatedActiveMsRef = useRef(0);
  const fullscreenTriggerRef = useRef<HTMLElement | null>(null);

  const { playCountdown, playPhaseChange, playComplete } = useAudio();
  const currentStep = steps[currentIndex];
  const totalTimedSeconds = useMemo(
    () => steps.reduce((total, step) => total + (step.durationSeconds ?? 0), 0),
    [steps],
  );

  const startActiveClock = useCallback(() => {
    activeStartedAtRef.current ??= Date.now();
  }, []);

  const pauseActiveClock = useCallback(() => {
    if (activeStartedAtRef.current === null) return;
    accumulatedActiveMsRef.current += Math.max(0, Date.now() - activeStartedAtRef.current);
    activeStartedAtRef.current = null;
  }, []);

  const enterFullscreen = useCallback(async () => {
    fullscreenTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsFullscreen(true);

    if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
      nativeFullscreenActiveRef.current = true;
    } catch {
      // Keep the viewport-covering portal presentation if native fullscreen is unavailable.
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    nativeFullscreenActiveRef.current = false;

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // The visual fullscreen state has already been cleared.
      }
    }
  }, []);

  const finish = useCallback(() => {
    pauseActiveClock();
    const activeDurationMs = accumulatedActiveMsRef.current;
    const elapsedSeconds =
      activeDurationMs > 0 ? Math.max(1, Math.round(activeDurationMs / 1000)) : totalTimedSeconds;
    setCompletedDurationSeconds(Math.max(1, elapsedSeconds || 1));
    playComplete();
    stepDeadlineRef.current = null;
    setIsRunning(false);
    setDone(true);
    void exitFullscreen();
  }, [exitFullscreen, pauseActiveClock, playComplete, totalTimedSeconds]);

  const goToStep = useCallback(
    (nextIndex: number, keepRunning = false) => {
      const nextStep = steps[nextIndex];

      if (!nextStep) {
        finish();
        return;
      }

      setCurrentIndex(nextIndex);
      setSecondsLeft(nextStep.durationSeconds);
      const nextDurationSeconds = nextStep.durationSeconds;
      const shouldRun = keepRunning && nextDurationSeconds !== null;
      if (keepRunning && nextDurationSeconds !== null) {
        stepDeadlineRef.current = Date.now() + nextDurationSeconds * 1000;
        startActiveClock();
      } else {
        stepDeadlineRef.current = null;
        pauseActiveClock();
      }
      setIsRunning(shouldRun);
    },
    [finish, pauseActiveClock, startActiveClock, steps],
  );

  useEffect(() => {
    setCurrentIndex(0);
    setSecondsLeft(steps[0]?.durationSeconds ?? null);
    setIsRunning(false);
    setDone(steps.length === 0);
    setCompletedDurationSeconds(null);
    void exitFullscreen();
    stepDeadlineRef.current = null;
    activeStartedAtRef.current = null;
    accumulatedActiveMsRef.current = 0;
  }, [exitFullscreen, steps]);

  useEffect(() => {
    const syncFullscreenState = () => {
      if (document.fullscreenElement) {
        nativeFullscreenActiveRef.current = true;
        setIsFullscreen(true);
        return;
      }

      if (nativeFullscreenActiveRef.current) {
        nativeFullscreenActiveRef.current = false;
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    timerContainerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void exitFullscreen();
        return;
      }

      if (event.key !== 'Tab' || !timerContainerRef.current) return;

      const focusableElements = Array.from(
        timerContainerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        timerContainerRef.current.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      fullscreenTriggerRef.current?.focus();
      fullscreenTriggerRef.current = null;
    };
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => {
    if (!currentStep || currentStep.durationSeconds === null || !isRunning || done) return;

    const updateRemainingTime = () => {
      if (stepDeadlineRef.current === null) return;
      const nextSecondsLeft = Math.max(0, Math.ceil((stepDeadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(nextSecondsLeft);
    };

    updateRemainingTime();
    const timer = window.setInterval(updateRemainingTime, 250);
    return () => window.clearInterval(timer);
  }, [currentStep, done, isRunning]);

  useEffect(() => {
    if (
      !currentStep ||
      currentStep.durationSeconds === null ||
      !isRunning ||
      secondsLeft === null ||
      done
    )
      return;

    if (secondsLeft > 0 && secondsLeft <= 3) {
      playCountdown();
    }

    if (secondsLeft <= 0) {
      if (currentIndex < steps.length - 1) {
        playPhaseChange();
        goToStep(currentIndex + 1, true);
      } else {
        finish();
      }
      return;
    }
  }, [
    currentIndex,
    currentStep,
    done,
    finish,
    goToStep,
    isRunning,
    playCountdown,
    playPhaseChange,
    secondsLeft,
    steps.length,
  ]);

  const toggleTimer = useCallback(() => {
    if (secondsLeft === null) return;

    if (isRunning) {
      if (stepDeadlineRef.current !== null) {
        setSecondsLeft(Math.max(0, Math.ceil((stepDeadlineRef.current - Date.now()) / 1000)));
      }
      stepDeadlineRef.current = null;
      pauseActiveClock();
      setIsRunning(false);
      return;
    }

    stepDeadlineRef.current = Date.now() + Math.max(0, secondsLeft) * 1000;
    startActiveClock();
    setIsRunning(true);
    void enterFullscreen();
  }, [enterFullscreen, isRunning, pauseActiveClock, secondsLeft, startActiveClock]);

  if (done || !currentStep) {
    if (completeAction && sessionMeta) {
      return (
        <section aria-labelledby="session-complete-title" className="glass-soft p-6 text-center">
          <div role="status" aria-live="polite">
            <p id="session-complete-title" className="text-3xl font-black text-primary-300">
              Seance terminee
            </p>
            <p className="mt-2 text-zinc-300">Ajoutez votre ressenti pour ajuster la suite.</p>
          </div>
          <SessionCompletionForm
            completeAction={completeAction}
            durationSeconds={completedDurationSeconds ?? Math.max(1, totalTimedSeconds)}
            sessionMeta={sessionMeta}
          />
        </section>
      );
    }

    return (
      <div role="status" aria-live="polite" className="glass-soft p-8 text-center">
        <p className="text-3xl font-black text-primary-300">Seance terminee</p>
        <p className="mt-2 text-zinc-300">Bien joue. Prenez quelques minutes pour recuperer.</p>
      </div>
    );
  }

  const hasStepTimer = currentStep.durationSeconds !== null;
  const currentStepRemaining = hasStepTimer
    ? Math.max(secondsLeft ?? currentStep.durationSeconds ?? 0, 0)
    : 0;
  const futureTimedSeconds = steps
    .slice(currentIndex + 1)
    .reduce((total, step) => total + (step.durationSeconds ?? 0), 0);
  const sessionSecondsLeft = currentStepRemaining + futureTimedSeconds;
  const sessionProgress =
    totalTimedSeconds > 0
      ? Math.min(
          100,
          Math.round(((totalTimedSeconds - sessionSecondsLeft) / totalTimedSeconds) * 100),
        )
      : null;
  const timeDisplay = hasStepTimer ? formatTime(currentStepRemaining) : null;
  const isLastStep = currentIndex === steps.length - 1;
  const isCountingDown = isRunning && (secondsLeft ?? 0) <= 3 && (secondsLeft ?? 0) > 0;
  const sessionDisplay = formatTime(sessionSecondsLeft);
  const progressLabel = getProgressLabel(currentStep, exercises.length);
  const primaryButtonLabel = hasStepTimer
    ? isRunning
      ? 'Pause'
      : secondsLeft === currentStep.durationSeconds
        ? 'Demarrer'
        : 'Reprendre'
    : currentStep.type === 'exercise'
      ? "Terminer l'exercice"
      : 'Continuer';
  const secondaryButtonLabel = isLastStep
    ? 'Terminer'
    : currentStep.type === 'rest'
      ? 'Passer le repos'
      : 'Passer';

  const timerContainerClassName = isFullscreen
    ? 'fixed inset-0 z-[9999] flex h-[100dvh] min-h-screen w-screen flex-col items-center gap-4 overflow-y-auto bg-zinc-950 px-4 py-5 sm:justify-center sm:px-8 sm:py-8'
    : 'flex flex-col items-center gap-6';
  const timerCardClassName = [
    'relative w-full overflow-hidden rounded-[2rem] border border-white/[0.15] bg-zinc-950/60 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl',
    isFullscreen ? 'max-w-4xl p-6 sm:p-8' : 'max-w-xl p-5 sm:p-8',
  ].join(' ');
  const timerRingClassName = [
    'grid place-items-center rounded-full border border-white/10 shadow-2xl shadow-black/30 transition-colors',
    isFullscreen ? 'h-64 w-64' : 'h-52 w-52',
    isCountingDown
      ? 'animate-pulse bg-sport-orange/[0.15] text-sport-orange'
      : 'bg-white/[0.06] text-white',
  ].join(' ');
  const timerRingInnerClassName = [
    'grid place-items-center rounded-full bg-zinc-950/[0.85] font-mono font-black tabular-nums',
    isFullscreen ? 'h-52 w-52 text-6xl' : 'h-44 w-44 text-6xl',
  ].join(' ');
  const titleClassName = [
    'break-words font-black text-white',
    isFullscreen ? 'text-4xl' : 'text-3xl',
  ].join(' ');

  const timerContent = (
    <section
      ref={timerContainerRef}
      aria-labelledby="timer-exercise-title"
      aria-modal={isFullscreen ? true : undefined}
      role={isFullscreen ? 'dialog' : undefined}
      tabIndex={isFullscreen ? -1 : undefined}
      className={timerContainerClassName}
    >
      {totalTimedSeconds > 0 && (
        <div className="w-full">
          <div className="mb-2 flex justify-between text-xs font-bold text-zinc-400">
            <span>Session</span>
            <span
              role="timer"
              aria-label={`Temps chronometre restant : ${sessionDisplay}`}
              aria-live="off"
            >
              {sessionDisplay} restant
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10 p-1">
            <div
              className="h-full rounded-full bg-primary-300 transition-all duration-1000"
              style={{ width: `${sessionProgress ?? 0}%` }}
              role="progressbar"
              aria-valuenow={sessionProgress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      <p className="premium-chip text-primary-200" aria-live="polite">
        {progressLabel}
      </p>

      <div className={timerCardClassName}>
        <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-primary-300/[0.15] blur-3xl" />
        <div className="relative">
          <p
            aria-live="assertive"
            className={`mb-3 text-xs font-black uppercase tracking-[0.22em] ${
              currentStep.type === 'exercise' ? 'text-primary-300' : 'text-sport-orange'
            }`}
          >
            {getStepLabel(currentStep)}
          </p>

          <h2 id="timer-exercise-title" className={titleClassName}>
            {currentStep.title}
          </h2>

          {currentStep.description && (
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-300">
              {currentStep.description}
            </p>
          )}

          <div className="mt-7 grid place-items-center">
            {hasStepTimer ? (
              <div
                role="timer"
                aria-label={`Temps restant : ${timeDisplay}`}
                aria-live="off"
                className={timerRingClassName}
                style={{
                  backgroundImage: `conic-gradient(#d9ff3f ${
                    currentStep.durationSeconds
                      ? ((currentStep.durationSeconds - currentStepRemaining) /
                          currentStep.durationSeconds) *
                        360
                      : 0
                  }deg, rgba(255,255,255,0.08) 0deg)`,
                }}
              >
                <span className={timerRingInnerClassName}>{timeDisplay}</span>
              </div>
            ) : (
              <ProgressRing value={100} label="manuel" size="lg" />
            )}
          </div>

          {currentStep.tips && currentStep.type === 'exercise' && (
            <p className="mx-auto mt-5 max-w-md rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-3 text-xs italic text-zinc-300">
              {currentStep.tips}
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
        <Button
          variant="primary"
          size="lg"
          className="w-full sm:min-w-44"
          onClick={() => {
            if (hasStepTimer) {
              toggleTimer();
            } else {
              goToStep(currentIndex + 1);
            }
          }}
          aria-pressed={hasStepTimer ? isRunning : undefined}
        >
          <Icon name={isRunning ? 'timer' : 'zap'} className="h-4 w-4" />
          {primaryButtonLabel}
        </Button>

        {hasStepTimer && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:min-w-44"
            onClick={() => {
              goToStep(currentIndex + 1);
            }}
          >
            <Icon name="arrow-right" className="h-4 w-4" />
            {secondaryButtonLabel}
          </Button>
        )}

        {isFullscreen && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:min-w-44"
            onClick={() => {
              void exitFullscreen();
            }}
          >
            <Icon name="minimize" className="h-4 w-4" />
            Quitter plein ecran
          </Button>
        )}
      </div>
    </section>
  );

  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(timerContent, document.body);
  }

  return timerContent;
}
