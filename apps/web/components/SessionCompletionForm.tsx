'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import type { CreateSessionLogInput } from '@alcide/shared';
import { Button } from './ui/Button';
import { useFormReady } from './useFormReady';
import Link from 'next/link';

export type SessionCompletionFeedback = 'too_easy' | 'good' | 'too_hard';

export type TimerSessionMeta = Omit<
  CreateSessionLogInput,
  'durationSeconds' | 'perceivedEffort' | 'feedback' | 'painNotes' | 'notes' | 'completedAt'
>;

export type SessionCompletionPayload = CreateSessionLogInput;

interface SessionCompletionFormProps {
  sessionMeta: TimerSessionMeta;
  durationSeconds: number;
  completeAction: (payload: SessionCompletionPayload) => Promise<{ error?: string } | void>;
}

const feedbackOptions: Array<{ value: SessionCompletionFeedback; label: string }> = [
  { value: 'too_easy', label: 'Trop facile' },
  { value: 'good', label: 'Bien dosé' },
  { value: 'too_hard', label: 'Trop difficile' },
];

export function SessionCompletionForm({
  sessionMeta,
  durationSeconds,
  completeAction,
}: SessionCompletionFormProps) {
  const formId = useId();
  const formReady = useFormReady();
  const [perceivedEffort, setPerceivedEffort] = useState(5);
  const [feedback, setFeedback] = useState<SessionCompletionFeedback>('good');
  const [painNotes, setPainNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formReady) return;
    setError(null);
    setIsSaved(false);
    setIsSaving(true);

    const payload: SessionCompletionPayload = {
      ...sessionMeta,
      durationSeconds,
      perceivedEffort,
      feedback,
      completedAt: new Date().toISOString(),
      ...(painNotes.trim() ? { painNotes: painNotes.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      const result = await completeAction(payload);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setIsSaved(true);
    } catch {
      setError("Impossible d'enregistrer le retour pour le moment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      method="post"
      className="completion-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      aria-describedby={`${formId}-status`}
    >
      <fieldset disabled={!formReady} className="contents">
        <fieldset disabled={!formReady || isSaving || isSaved}>
          <legend>Effort perçu</legend>
          <div className="effort-options grid grid-cols-5 gap-2 md:grid-cols-10">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <label key={value} className="completion-choice">
                <input
                  className="sr-only"
                  type="radio"
                  name="perceivedEffort"
                  value={value}
                  checked={perceivedEffort === value}
                  onChange={() => setPerceivedEffort(value)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
          <div className="muted-copy mt-2 flex justify-between text-xs">
            <span>Très léger</span>
            <span>Maximum</span>
          </div>
        </fieldset>
        <fieldset disabled={!formReady || isSaving || isSaved}>
          <legend>Ressenti global</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {feedbackOptions.map((option) => (
              <label key={option.value} className="completion-choice">
                <input
                  className="sr-only"
                  type="radio"
                  name="feedback"
                  value={option.value}
                  checked={feedback === option.value}
                  onChange={() => setFeedback(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label mb-3 block" htmlFor={`${formId}-pain`}>
              Douleur éventuelle <span className="font-normal text-primary-200">(facultatif)</span>
            </label>
            <textarea
              id={`${formId}-pain`}
              className="field-control min-h-28 resize-y"
              value={painNotes}
              onChange={(event) => setPainNotes(event.target.value)}
              placeholder="Zone, intensité, gêne…"
              disabled={!formReady || isSaving || isSaved}
              maxLength={500}
            />
          </div>
          <div>
            <label className="field-label mb-3 block" htmlFor={`${formId}-notes`}>
              Notes <span className="font-normal text-primary-200">(facultatif)</span>
            </label>
            <textarea
              id={`${formId}-notes`}
              className="field-control min-h-28 resize-y"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Énergie, technique, adaptation…"
              disabled={!formReady || isSaving || isSaved}
              maxLength={500}
            />
          </div>
        </div>
        <p id={`${formId}-status`} role="status" aria-live="polite" className="min-h-5 text-sm">
          {error && <span className="font-semibold text-sport-orange">{error}</span>}
          {isSaved && !error && (
            <span className="font-semibold text-primary-200">Retour enregistré.</span>
          )}
        </p>
        <div className="form-footer">
          <Link
            href={
              sessionMeta.sourceType === 'program_session'
                ? `/programs/${sessionMeta.programId}`
                : '/workouts'
            }
            className="text-link"
          >
            Retour aux {sessionMeta.sourceType === 'program_session' ? 'programmes' : 'séances'}
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSaving}
            disabled={!formReady || isSaving || isSaved}
          >
            {isSaved ? 'Enregistré' : 'Enregistrer le retour'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
