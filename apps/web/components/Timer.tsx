'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { buildSessionSchedule, type SessionStep, type Exercise, type Phase } from '@alcide/shared';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { TimerTimeline } from './TimerTimeline';
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

type TimerStep = SessionStep;

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

  const playCountdown = useCallback(
    (isLastSecond = false) =>
      isLastSecond ? beep(1100, 0.32, 0.38) : beep(880, 0.08, 0.2),
    [beep],
  );

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

export const buildTimerSteps = buildSessionSchedule;

function formatTime(totalSeconds: number): string {
  const clampedSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(clampedSeconds / 60);
  const seconds = clampedSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getStepLabel(step: TimerStep): string {
  if (step.type === 'warmup') return 'ECHAUFFEMENT';
  if (step.type === 'rest') return 'REPOS';
  if (step.type === 'transition') return 'INSTALLATION';
  if (step.type === 'cooldown') return 'RETOUR CALME';
  return 'EXERCICE';
}

function getProgressLabel(step: TimerStep, exercisesCount: number): string {
  if (step.type === 'exercise' && step.exerciseIndex != null) {
    const series =
      step.setNumber !== undefined
        ? ` · ${step.circuitId ? 'Tour' : 'Série'} ${step.setNumber}/${step.sets}`
        : '';
    return `Exercice ${step.exerciseIndex + 1} sur ${exercisesCount}${series}`;
  }

  if (step.type === 'rest' && step.exerciseIndex != null) {
    return `Repos apres l'exercice ${step.exerciseIndex + 1} sur ${exercisesCount}`;
  }

  if (step.type === 'transition') return 'Installation du prochain mouvement';

  return step.type === 'warmup' ? 'Echauffement' : 'Retour calme';
}

export function Timer({ exercises, warmup, cooldown, completeAction, sessionMeta }: TimerProps) {
  // RSC refreshes may recreate identical props after saving a completion log.
  // Only a different session or changed workout content should reset the timer.
  const sessionVersion = JSON.stringify({
    sessionMeta,
    exercises,
    warmup: warmup ?? [],
    cooldown: cooldown ?? [],
  });
  const previousSessionVersion = useRef(sessionVersion);
  const steps = useMemo(
    () => buildTimerSteps(exercises, warmup, cooldown),
    [exercises, warmup, cooldown],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(steps[0]?.durationSeconds ?? null);
  const [isRunning, setIsRunning] = useState(false);
  const [startCountdownSeconds, setStartCountdownSeconds] = useState<number | null>(null);
  const [done, setDone] = useState(steps.length === 0);
  const [completedDurationSeconds, setCompletedDurationSeconds] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerContainerRef = useRef<HTMLElement | null>(null);
  const nativeFullscreenActiveRef = useRef(false);
  const stepDeadlineRef = useRef<number | null>(null);
  const activeStartedAtRef = useRef<number | null>(null);
  const accumulatedActiveMsRef = useRef(0);
  const sessionStartedRef = useRef(false);
  const startCountdownTimeoutsRef = useRef<number[]>([]);
  const fullscreenTriggerRef = useRef<HTMLElement | null>(null);

  const { playCountdown, playPhaseChange, playComplete } = useAudio();
  const currentStep = steps[currentIndex];
  const totalTimedSeconds = useMemo(
    () => steps.reduce((total, step) => total + step.plannedSeconds, 0),
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

  const restoreFullscreenTriggerFocus = useCallback(() => {
    const originalTrigger = fullscreenTriggerRef.current;
    const currentTrigger = timerContainerRef.current?.querySelector<HTMLElement>(
      '[data-timer-fullscreen-trigger]',
    );

    // Switching between the inline render and the portal replaces the original
    // button. Prefer it when it still exists, otherwise focus its live counterpart.
    const focusTarget = originalTrigger?.isConnected ? originalTrigger : currentTrigger;
    focusTarget?.focus();
    fullscreenTriggerRef.current = null;
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
      const shouldRun =
        keepRunning && (nextDurationSeconds !== null || nextStep.setNumber !== undefined);
      if (shouldRun) {
        stepDeadlineRef.current =
          nextDurationSeconds === null ? null : Date.now() + nextDurationSeconds * 1000;
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
    if (previousSessionVersion.current === sessionVersion) return;
    previousSessionVersion.current = sessionVersion;
    setCurrentIndex(0);
    setSecondsLeft(steps[0]?.durationSeconds ?? null);
    setIsRunning(false);
    setStartCountdownSeconds(null);
    setDone(steps.length === 0);
    setCompletedDurationSeconds(null);
    void exitFullscreen();
    startCountdownTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    startCountdownTimeoutsRef.current = [];
    stepDeadlineRef.current = null;
    activeStartedAtRef.current = null;
    accumulatedActiveMsRef.current = 0;
    sessionStartedRef.current = false;
  }, [exitFullscreen, sessionVersion, steps]);

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
      restoreFullscreenTriggerFocus();
    };
  }, [exitFullscreen, isFullscreen, restoreFullscreenTriggerFocus]);

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

    if (currentStep.type === 'exercise' && secondsLeft > 0 && secondsLeft <= 3) {
      playCountdown(secondsLeft === 1);
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

  const startTimer = useCallback(() => {
    stepDeadlineRef.current =
      secondsLeft === null ? null : Date.now() + Math.max(0, secondsLeft) * 1000;
    startActiveClock();
    sessionStartedRef.current = true;
    setIsRunning(true);
  }, [secondsLeft, startActiveClock]);

  const startInitialCountdown = useCallback(() => {
    startCountdownTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    setStartCountdownSeconds(3);
    playCountdown();

    startCountdownTimeoutsRef.current = [
      window.setTimeout(() => {
        setStartCountdownSeconds(2);
        playCountdown();
      }, 1000),
      window.setTimeout(() => {
        setStartCountdownSeconds(1);
        playCountdown(true);
      }, 2000),
      window.setTimeout(() => {
        startCountdownTimeoutsRef.current = [];
        setStartCountdownSeconds(null);
        startTimer();
      }, 3000),
    ];
  }, [playCountdown, startTimer]);

  useEffect(
    () => () => {
      startCountdownTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    },
    [],
  );

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      if (stepDeadlineRef.current !== null) {
        setSecondsLeft(Math.max(0, Math.ceil((stepDeadlineRef.current - Date.now()) / 1000)));
      }
      stepDeadlineRef.current = null;
      pauseActiveClock();
      setIsRunning(false);
      return;
    }

    if (!sessionStartedRef.current) {
      startInitialCountdown();
      void enterFullscreen();
      return;
    }

    startTimer();
    void enterFullscreen();
  }, [enterFullscreen, isRunning, pauseActiveClock, startInitialCountdown, startTimer]);

  if (done || !currentStep) {
    if (completeAction && sessionMeta) {
      return (
        <section aria-labelledby="session-complete-title" className="session-completion">
          <div role="status" aria-live="polite">
            <h2 id="session-complete-title" className="page-title">
              Bilan de séance
            </h2>
            <p className="mt-3 font-semibold text-primary-200">Séance terminée</p>
            <p className="mt-2 text-zinc-300">
              {sessionMeta.title} ·{' '}
              {formatTime(completedDurationSeconds ?? Math.max(1, totalTimedSeconds))}
            </p>
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
        <p className="text-3xl font-black text-primary-300">Séance terminée</p>
        <p className="mt-2 text-zinc-300">Bien joue. Prenez quelques minutes pour recuperer.</p>
      </div>
    );
  }

  const hasStepTimer = currentStep.durationSeconds !== null;
  const isPrescribedManual = !hasStepTimer && currentStep.setNumber !== undefined;
  const isEstimatedSession = steps.some(
    (step) => step.durationSeconds === null && step.plannedSeconds > 0,
  );
  const currentStepRemaining = hasStepTimer
    ? Math.max(secondsLeft ?? currentStep.durationSeconds ?? 0, 0)
    : currentStep.plannedSeconds;
  const futureTimedSeconds = steps
    .slice(currentIndex + 1)
    .reduce((total, step) => total + step.plannedSeconds, 0);
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
  const primaryButtonLabel =
    startCountdownSeconds !== null
      ? `Départ dans ${startCountdownSeconds}`
      : hasStepTimer || isPrescribedManual
        ? isRunning
          ? 'Pause'
          : secondsLeft === currentStep.durationSeconds &&
              !(isPrescribedManual && accumulatedActiveMsRef.current > 0)
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

  const ringLength = 2 * Math.PI * 52;
  const ringRemaining = currentStep.durationSeconds
    ? currentStepRemaining / currentStep.durationSeconds
    : 1;
  const manualExercise =
    currentStep.exerciseIndex !== undefined ? exercises[currentStep.exerciseIndex] : undefined;

  const timerContent = (
    <section
      ref={timerContainerRef}
      aria-labelledby="timer-exercise-title"
      aria-modal={isFullscreen ? true : undefined}
      role={isFullscreen ? 'dialog' : undefined}
      tabIndex={isFullscreen ? -1 : undefined}
      className={`timer-shell ${isFullscreen ? 'timer-fullscreen' : ''}`}
    >
      {isFullscreen && (
        <div className="timer-fullscreen-header">
          <span className="muted-copy">{sessionMeta?.title ?? 'Séance en cours'}</span>
          <button
            type="button"
            className="action-secondary"
            onClick={() => {
              void exitFullscreen();
            }}
          >
            <Icon name="minimize" className="h-5 w-5" />
            Quitter plein écran
          </button>
        </div>
      )}
      <div className="timer-layout">
        <div className="timer-main">
          <div className="timer-stage">
            <p className="mb-2 text-sm text-primary-200" aria-live="assertive">
              {getStepLabel(currentStep)}
            </p>
            <h2 id="timer-exercise-title" className="break-words text-3xl font-extrabold">
              {currentStep.title}
            </h2>
            <p className="muted-copy mt-3" aria-live="polite">
              {progressLabel}
            </p>
            {currentStep.description && (
              <p className="muted-copy mx-auto mt-4 max-w-xl">{currentStep.description}</p>
            )}
            <div className="my-7">
              {hasStepTimer ? (
                <div
                  role="timer"
                  aria-label={`Temps restant : ${timeDisplay}`}
                  aria-live="off"
                  className={`timer-ring ${isCountingDown ? 'text-sport-orange' : 'text-primary-200'}`}
                >
                  <svg viewBox="0 0 120 120" aria-hidden="true" fill="none">
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      stroke="currentColor"
                      strokeOpacity=".12"
                      strokeWidth="7"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={ringLength}
                      strokeDashoffset={ringLength * (1 - ringRemaining)}
                    />
                  </svg>
                  <span className="timer-value">{timeDisplay}</span>
                </div>
              ) : (
                <div className="timer-ring glass-soft">
                  <div>
                    <p className="text-3xl font-bold">
                      {isPrescribedManual
                        ? `${currentStep.reps} répétitions`
                        : manualExercise?.sets && manualExercise?.reps
                          ? `${manualExercise.sets} × ${manualExercise.reps}`
                          : 'À votre rythme'}
                    </p>
                    <p className="muted-copy mt-3">
                      {isPrescribedManual
                        ? 'À votre rythme · validez la série une fois terminée'
                        : 'Mode manuel'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {currentStep.tips && currentStep.type === 'exercise' && (
              <p className="muted-copy mx-auto max-w-xl text-sm">{currentStep.tips}</p>
            )}
          </div>
          <div className="timer-controls">
            <Button
              variant="primary"
              size="lg"
              data-timer-fullscreen-trigger
              onClick={() => {
                if (hasStepTimer || isPrescribedManual) toggleTimer();
                else goToStep(currentIndex + 1);
              }}
              disabled={startCountdownSeconds !== null}
              aria-pressed={hasStepTimer || isPrescribedManual ? isRunning : undefined}
            >
              <Icon
                name={isRunning ? 'pause' : hasStepTimer || isPrescribedManual ? 'play' : 'check'}
                className="h-5 w-5"
              />
              {primaryButtonLabel}
            </Button>
            {isPrescribedManual && (
              <Button
                variant="secondary"
                size="lg"
                disabled={startCountdownSeconds !== null}
                onClick={() => goToStep(currentIndex + 1, isRunning)}
              >
                <Icon name="check" className="h-5 w-5" />
                Série terminée
              </Button>
            )}
            {hasStepTimer && (
              <Button
                variant="secondary"
                size="lg"
                disabled={startCountdownSeconds !== null}
                onClick={() => {
                  goToStep(currentIndex + 1);
                }}
              >
                {secondaryButtonLabel}
                <Icon name="arrow-right" className="h-5 w-5" />
              </Button>
            )}
          </div>
          {totalTimedSeconds > 0 && (
            <div className="timer-session-progress">
              <div className="muted-copy mb-3 flex justify-between gap-4 text-sm">
                <span>{isEstimatedSession ? 'Estimation restante' : 'Session'}</span>
                <span
                  role="timer"
                  aria-label={`${isEstimatedSession ? 'Temps estimé restant' : 'Temps chronometre restant'} : ${sessionDisplay}`}
                  aria-live="off"
                >
                  {isEstimatedSession ? '≈ ' : ''}
                  {sessionDisplay} restant
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-primary-200"
                  style={{ width: `${sessionProgress ?? 0}%` }}
                  role="progressbar"
                  aria-label="Progression de la séance"
                  aria-valuenow={sessionProgress ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              {steps[currentIndex + 1] && (
                <p className="muted-copy mt-4 text-sm">
                  À suivre : {steps[currentIndex + 1]?.title}
                </p>
              )}
            </div>
          )}
        </div>
        {isFullscreen && <TimerTimeline steps={steps} currentIndex={currentIndex} />}
      </div>
    </section>
  );

  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(timerContent, document.body);
  }

  return timerContent;
}
