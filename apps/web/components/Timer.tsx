'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Exercise } from '@sportcoach/shared';
import { Button } from './ui/Button';

interface TimerProps {
  exercises: Exercise[];
}

// RGAA 4.1: timer accessible avec aria-live pour les annonces dynamiques
export function Timer({ exercises }: TimerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'exercise' | 'rest'>('exercise');

  const currentExercise = exercises[currentIndex];

  const getExerciseDuration = useCallback(
    (exercise: Exercise): number => exercise.duration_seconds ?? 60,
    [],
  );

  // Initialiser le timer au changement d'exercice
  useEffect(() => {
    if (currentExercise) {
      const duration =
        phase === 'exercise'
          ? getExerciseDuration(currentExercise)
          : currentExercise.rest_seconds;
      setSecondsLeft(duration);
    }
  }, [currentIndex, phase, currentExercise, getExerciseDuration]);

  // Décompte
  useEffect(() => {
    if (!isRunning || secondsLeft === null) return;

    if (secondsLeft <= 0) {
      // Passer à la phase suivante
      if (phase === 'exercise') {
        setPhase('rest');
      } else if (currentIndex < exercises.length - 1) {
        setCurrentIndex((i) => i + 1);
        setPhase('exercise');
      } else {
        // Séance terminée
        setIsRunning(false);
      }
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [isRunning, secondsLeft, phase, currentIndex, exercises.length]);

  if (!currentExercise) {
    return (
      // RGAA 4.1: message de fin avec aria-live
      <div role="status" aria-live="polite" className="text-center py-8">
        <p className="text-2xl font-bold text-sport-green">Séance terminée !</p>
        <p className="text-gray-600 mt-2">Bien joué — n'oubliez pas de vous étirer.</p>
      </div>
    );
  }

  const minutes = Math.floor((secondsLeft ?? 0) / 60);
  const seconds = (secondsLeft ?? 0) % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isLastExercise = currentIndex === exercises.length - 1;

  return (
    <section aria-labelledby="timer-exercise-title" className="flex flex-col items-center gap-6">
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

        {/* Timer — valeur annoncée avec aria-live */}
        <div
          role="timer"
          aria-label={`Temps restant : ${timeDisplay}`}
          aria-live="off"
          className="mt-6 text-7xl font-mono font-bold tabular-nums text-gray-900"
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
