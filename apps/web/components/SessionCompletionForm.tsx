'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import type { CreateSessionLogInput } from '@alcide/shared';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

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
  { value: 'good', label: 'Bien dose' },
  { value: 'too_hard', label: 'Trop dur' },
];

export function SessionCompletionForm({
  sessionMeta,
  durationSeconds,
  completeAction,
}: SessionCompletionFormProps) {
  const formId = useId();
  const [perceivedEffort, setPerceivedEffort] = useState(5);
  const [feedback, setFeedback] = useState<SessionCompletionFeedback>('good');
  const [painNotes, setPainNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      className="mx-auto mt-6 flex w-full max-w-2xl flex-col gap-5 rounded-[1.8rem] border border-white/10 bg-zinc-950/[0.55] p-5 text-left shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-6"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      aria-describedby={`${formId}-status`}
    >
      <div className="flex items-start gap-3">
        <span className="icon-bubble bg-primary-300 text-zinc-950">
          <Icon name="check" className="h-4 w-4" />
        </span>
        <p className="text-sm leading-6 text-zinc-300">
          Votre retour alimente le suivi : effort, dosage et notes utiles pour la prochaine seance.
        </p>
      </div>

      <fieldset className="space-y-3" disabled={isSaving}>
        <legend className="text-sm font-black text-white">Effort percu</legend>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-full border text-sm font-black transition-colors ${
                perceivedEffort === value
                  ? 'border-primary-300 bg-primary-300 text-zinc-950'
                  : 'border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/[0.1]'
              }`}
            >
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
      </fieldset>

      <fieldset className="space-y-3" disabled={isSaving}>
        <legend className="text-sm font-black text-white">Ressenti global</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {feedbackOptions.map((option) => (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-3 text-center text-sm font-black transition-colors ${
                feedback === option.value
                  ? 'border-primary-300 bg-primary-300 text-zinc-950'
                  : 'border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/[0.1]'
              }`}
            >
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-black text-white" htmlFor={`${formId}-pain`}>
            Douleur eventuelle
          </label>
          <textarea
            id={`${formId}-pain`}
            className="field-control min-h-24 resize-y"
            value={painNotes}
            onChange={(event) => setPainNotes(event.target.value)}
            placeholder="Zone, intensite, gene..."
            disabled={isSaving}
            maxLength={500}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-black text-white" htmlFor={`${formId}-notes`}>
            Notes
          </label>
          <textarea
            id={`${formId}-notes`}
            className="field-control min-h-24 resize-y"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Energie, technique, adaptation..."
            disabled={isSaving}
            maxLength={500}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id={`${formId}-status`} role="status" aria-live="polite" className="min-h-5 text-sm text-zinc-300">
          {error && <span className="font-semibold text-sport-orange">{error}</span>}
          {isSaved && !error && <span className="font-semibold text-primary-300">Retour enregistre.</span>}
        </p>

        <Button type="submit" variant="primary" size="lg" isLoading={isSaving} disabled={isSaving || isSaved}>
          {isSaved ? 'Sauvegarde' : 'Enregistrer le retour'}
        </Button>
      </div>
    </form>
  );
}
