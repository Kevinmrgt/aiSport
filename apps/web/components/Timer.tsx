'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Exercise } from '@sportcoach/shared';
import { Button } from './ui/Button';

interface TimerProps {
  exercises: Exercise[];
  totalDurationMinutes?: number;
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

// RGAA 4.1: timer accessible avec aria-live pour les annonces dynamiques
export function Timer({ exercises, totalDurationMinutes }: TimerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'exercise' | 'rest'>('exercise');
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(
    totalDurationMinutes != null ? totalDurationMinutes * 60 : null,
  );
  const [done, setDone] = useState(false);

  const { playCountdown, playPhaseChange, playComplete } = useAudio();
  const currentExercise = exercises[currentIndex];

  const getExerciseDuration = useCallback(
    (exercise: Exercise): number => exercise.duration_seconds ?? 60,
    [],
  );

  const finish = useCallback(() => {
    playComplete();
    setIsRunning(false);
    setDone(true);
  }, [playComplete]);

  // Initialiser le timer au changement d'exercice/phase
  useEffect(() => {
    if (currentExercise && !done) {
      const duration =
        phase === 'exercise'
          ? getExerciseDuration(currentExercise)
          : currentExercise.rest_seconds;
      setSecondsLeft(duration);
    }
  }, [currentIndex, phase, currentExercise, getExerciseDuration, done]);

  // Décompte par exercice
  useEffect(() => {
    if (!isRunning || secondsLeft === null || done) return;

    if (secondsLeft > 0 && secondsLeft <= 3) {
      playCountdown();
    }

    if (secondsLeft <= 0) {
      if (phase === 'exercise') {
        playPhaseChange();
        setPhase('rest');
      } else if (currentIndex < exercises.length - 1) {
        playPhaseChange();
        setCurrentIndex((i) => i + 1);
        setPhase('exercise');
      } else {
        finish();
      }
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [isRunning, secondsLeft, phase, currentIndex, exercises.length, done, playCountdown, playPhaseChange, finish]);

  // Timer de séance global (respecte la durée demandée)
  useEffect(() => {
    if (!isRunning || sessionSecondsLeft === null || done) return;

    if (sessionSecondsLeft <= 0) {
      finish();
      return;
    }

    const timer = setTimeout(
      () => setSessionSecondsLeft((s) => (s !== null ? s - 1 : null)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [isRunning, sessionSecondsLeft, done, finish]);

  if (done || !currentExercise) {
    return (
      // RGAA 4.1: message de fin avec aria-live
      <div role="status" aria-live="polite" className="text-center py-8">
        <p className="text-2xl font-bold text-sport-green">Séance terminée !</p>
        <p className="text-gray-600 mt-2">Bien joué — n&apos;oubliez pas de vous étirer.</p>
      </div>
    );
  }

  const minutes = Math.floor((secondsLeft ?? 0) / 60);
  const seconds = (secondsLeft ?? 0) % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isLastExercise = currentIndex === exercises.length - 1;
  const isCountingDown = isRunning && (secondsLeft ?? 0) <= 3 && (secondsLeft ?? 0) > 0;

  const sessionTotal = totalDurationMinutes != null ? totalDurationMinutes * 60 : null;
  const sessionProgress =
    sessionTotal != null && sessionSecondsLeft != null
      ? Math.round(((sessionTotal - sessionSecondsLeft) / sessionTotal) * 100)
      : null;
  const sessionMinutes = Math.floor((sessionSecondsLeft ?? 0) / 60);
  const sessionSecs = (sessionSecondsLeft ?? 0) % 60;
  const sessionDisplay = `${String(sessionMinutes).padStart(2, '0')}:${String(sessionSecs).padStart(2, '0')}`;

  return (
    <section aria-labelledby="timer-exercise-title" className="flex flex-col items-center gap-6">
      {/* Timer de séance global */}
      {sessionSecondsLeft != null && (
        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Séance</span>
            <span
              role="timer"
              aria-label={`Temps de séance restant : ${sessionDisplay}`}
              aria-live="off"
            >
              {sessionDisplay} restant
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-1000"
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
      <p className="text-sm text-gray-500" aria-live="polite">
        Exercice {currentIndex + 1} sur {exercises.length}
      </p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
        {/* Phase actuelle annoncée aux lecteurs d'écran */}
        <p
          aria-live="assertive"
          className={`text-xs font-bold uppercase tracking-widest mb-2 ${
            phase === 'exercise' ? 'text-primary-600' : 'text-sport-orange'
          }`}
        >
          {phase === 'exercise' ? 'EXERCICE' : 'REPOS'}
        </p>

        <h2 id="timer-exercise-title" className="text-2xl font-bold text-gray-900">
          {phase === 'exercise' ? currentExercise.name : 'Récupération'}
        </h2>

        {phase === 'exercise' && (
          <p className="mt-2 text-gray-600 text-sm">{currentExercise.description}</p>
        )}

        {/* Timer — rouge + clignotant sur les 3 dernières secondes */}
        <div
          role="timer"
          aria-label={`Temps restant : ${timeDisplay}`}
          aria-live="off"
          className={`mt-6 text-7xl font-mono font-bold tabular-nums transition-colors ${
            isCountingDown ? 'text-red-500 animate-pulse' : 'text-gray-900'
          }`}
        >
          {timeDisplay}
        </div>

        {currentExercise.tips && phase === 'exercise' && (
          <p className="mt-4 text-xs text-gray-500 italic">
            <span aria-hidden="true">💡</span> {currentExercise.tips}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={() => setIsRunning((r) => !r)}
          aria-pressed={isRunning}
        >
          {isRunning ? 'Pause' : secondsLeft === null ? 'Démarrer' : 'Reprendre'}
        </Button>

        {!isLastExercise && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setCurrentIndex((i) => i + 1);
              setPhase('exercise');
              setIsRunning(false);
            }}
          >
            Passer
          </Button>
        )}
      </div>
    </section>
  );
}
