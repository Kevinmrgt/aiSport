'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Exercise, Phase } from '@sportcoach/shared';
import { Button } from './ui/Button';

interface TimerProps {
  exercises: Exercise[];
  warmup?: Phase[];
  cooldown?: Phase[];
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
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
        // Audio non disponible
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
        title: 'Récupération',
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
  if (step.type === 'warmup') return 'ÉCHAUFFEMENT';
  if (step.type === 'rest') return 'REPOS';
  if (step.type === 'cooldown') return 'RÉCUPÉRATION';
  return 'EXERCICE';
}

function getProgressLabel(step: TimerStep, exercisesCount: number): string {
  if (step.type === 'exercise' && step.exerciseIndex != null) {
    return `Exercice ${step.exerciseIndex + 1} sur ${exercisesCount}`;
  }

  if (step.type === 'rest' && step.exerciseIndex != null) {
    return `Repos après l'exercice ${step.exerciseIndex + 1} sur ${exercisesCount}`;
  }

  return step.type === 'warmup' ? 'Échauffement' : 'Récupération';
}

// RGAA 4.1: timer accessible avec aria-live pour les annonces dynamiques
export function Timer({ exercises, warmup, cooldown }: TimerProps) {
  const steps = useMemo(() => buildTimerSteps(exercises, warmup, cooldown), [exercises, warmup, cooldown]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(steps[0]?.durationSeconds ?? null);
  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(steps.length === 0);

  const { playCountdown, playPhaseChange, playComplete } = useAudio();
  const currentStep = steps[currentIndex];
  const totalTimedSeconds = useMemo(
    () => steps.reduce((total, step) => total + (step.durationSeconds ?? 0), 0),
    [steps],
  );

  const finish = useCallback(() => {
    playComplete();
    setIsRunning(false);
    setDone(true);
  }, [playComplete]);

  const goToStep = useCallback(
    (nextIndex: number, keepRunning = false) => {
      const nextStep = steps[nextIndex];

      if (!nextStep) {
        finish();
        return;
      }

      setCurrentIndex(nextIndex);
      setSecondsLeft(nextStep.durationSeconds);
      setIsRunning(keepRunning && nextStep.durationSeconds !== null);
    },
    [finish, steps],
  );

  // Recaler l'état si une nouvelle séance est chargée.
  useEffect(() => {
    setCurrentIndex(0);
    setSecondsLeft(steps[0]?.durationSeconds ?? null);
    setIsRunning(false);
    setDone(steps.length === 0);
  }, [steps]);

  // Décompte de l'étape chronométrée en cours.
  useEffect(() => {
    if (!currentStep || currentStep.durationSeconds === null || !isRunning || secondsLeft === null || done) return;

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

    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [currentIndex, currentStep, done, finish, goToStep, isRunning, playCountdown, playPhaseChange, secondsLeft, steps.length]);

  if (done || !currentStep) {
    return (
      // RGAA 4.1: message de fin avec aria-live
      <div role="status" aria-live="polite" className="surface-soft py-8 text-center">
        <p className="text-2xl font-black text-primary-300">Séance terminée !</p>
        <p className="mt-2 text-zinc-400">Bien joué — n&apos;oubliez pas de vous étirer.</p>
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
      ? Math.min(100, Math.round(((totalTimedSeconds - sessionSecondsLeft) / totalTimedSeconds) * 100))
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
        ? 'Démarrer'
        : 'Reprendre'
    : currentStep.type === 'exercise'
      ? "Terminer l'exercice"
      : 'Continuer';
  const secondaryButtonLabel = isLastStep
    ? 'Terminer'
    : currentStep.type === 'rest'
      ? 'Passer le repos'
      : 'Passer';

  return (
    <section aria-labelledby="timer-exercise-title" className="flex flex-col items-center gap-6">
      {/* Timer de séance global, dérivé des étapes chronométrées restantes. */}
      {totalTimedSeconds > 0 && (
        <div className="w-full max-w-md">
          <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-400">
            <span>Séance</span>
            <span
              role="timer"
              aria-label={`Temps chronométré restant : ${sessionDisplay}`}
              aria-live="off"
            >
              {sessionDisplay} restant
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
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

      {/* RGAA 4.1: indication de progression */}
      <p className="text-sm font-semibold text-primary-300" aria-live="polite">
        {progressLabel}
      </p>

      <div className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/80 p-5 text-center shadow-2xl shadow-black/20 sm:p-8">
        {/* Phase actuelle annoncée aux lecteurs d'écran */}
        <p
          aria-live="assertive"
          className={`text-xs font-bold uppercase tracking-widest mb-2 ${
            currentStep.type === 'exercise' ? 'text-primary-300' : 'text-sport-orange'
          }`}
        >
          {getStepLabel(currentStep)}
        </p>

        <h2 id="timer-exercise-title" className="break-words text-2xl font-black text-white">
          {currentStep.title}
        </h2>

        {currentStep.description && (
          <p className="mt-2 text-sm text-zinc-400">{currentStep.description}</p>
        )}

        {hasStepTimer ? (
          // Timer — rouge + clignotant sur les 3 dernières secondes
          <div
            role="timer"
            aria-label={`Temps restant : ${timeDisplay}`}
            aria-live="off"
            className={`mt-6 text-6xl font-mono font-bold tabular-nums transition-colors sm:text-7xl ${
              isCountingDown ? 'text-red-400 animate-pulse' : 'text-white'
            }`}
          >
            {timeDisplay}
          </div>
        ) : (
          <div role="status" aria-live="polite" className="mt-6 text-2xl font-black text-white">
            Sans chrono
          </div>
        )}

        {currentStep.tips && currentStep.type === 'exercise' && (
          <p className="mt-4 text-xs italic text-zinc-400">
            <span aria-hidden="true">💡</span> {currentStep.tips}
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button
          variant="primary"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => {
            if (hasStepTimer) {
              setIsRunning((r) => !r);
            } else {
              goToStep(currentIndex + 1);
            }
          }}
          aria-pressed={hasStepTimer ? isRunning : undefined}
        >
          {primaryButtonLabel}
        </Button>

        {hasStepTimer && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => goToStep(currentIndex + 1)}
          >
            {secondaryButtonLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
