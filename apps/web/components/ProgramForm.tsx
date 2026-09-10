'use client';

import { useState } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { useFormReady } from './useFormReady';
import { Icon } from './ui/Icon';
import { GenerationQuotaNotice } from './GenerationQuotaNotice';
import { GenerateProgramInputSchema } from '@alcide/shared';
import type { GenerateProgramInput } from '@alcide/shared';
import type { GenerationQuota } from '@alcide/shared';
import { isNextRedirectError } from '@/lib/next-navigation';

interface ProgramFormProps {
  onSubmit: (data: GenerateProgramInput) => Promise<{ error?: string } | void>;
  generationQuota: GenerationQuota;
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

const WEEKS_OPTIONS = [
  { value: '2', label: '2 semaines' },
  { value: '3', label: '3 semaines' },
  { value: '4', label: '4 semaines' },
];

const SESSIONS_OPTIONS = [
  { value: '2', label: '2 séances / semaine' },
  { value: '3', label: '3 séances / semaine' },
  { value: '4', label: '4 séances / semaine' },
  { value: '5', label: '5 séances / semaine' },
];

const DURATION_OPTIONS = [
  { value: '20', label: '20 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
];

export function ProgramForm({ onSubmit, generationQuota }: ProgramFormProps) {
  const formReady = useFormReady();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof GenerateProgramInput, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sport: '',
    level: 'beginner' as GenerateProgramInput['level'],
    weeks_count: 3,
    sessions_per_week: 3,
    session_duration_minutes: 30,
    goals: '',
    constraints: '',
  });
  const quotaExhausted = generationQuota.limited && generationQuota.remaining === 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formReady) return;
    setErrors({});
    setGlobalError(null);

    const parsed = GenerateProgramInputSchema.safeParse({
      ...formData,
      weeks_count: Number(formData.weeks_count),
      sessions_per_week: Number(formData.sessions_per_week),
      session_duration_minutes: Number(formData.session_duration_minutes),
    });

    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const err of parsed.error.issues) {
        const field = err.path[0] as keyof GenerateProgramInput;
        if (field) fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      const firstInvalidField = parsed.error.issues[0]?.path[0];
      const firstInvalidControl = firstInvalidField
        ? e.currentTarget.elements.namedItem(String(firstInvalidField))
        : null;
      if (firstInvalidControl instanceof HTMLElement) firstInvalidControl.focus();
      return;
    }

    setIsLoading(true);
    try {
      const result = await onSubmit(parsed.data);
      if (result?.error) {
        setGlobalError(result.error);
      }
    } catch (error) {
      if (isNextRedirectError(error)) return;
      setGlobalError(
        error instanceof Error ? error.message : 'Une erreur est survenue, veuillez reessayer',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      method="post"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      noValidate
      aria-labelledby="program-form-title"
      className="glass-panel form-panel program-form-panel"
    >
      <fieldset disabled={!formReady} className="contents">
        <GenerationQuotaNotice quota={generationQuota} />
        {isLoading && (
          <p role="status" aria-live="polite" className="muted-copy">
            Préparation de votre programme… Chaque semaine est générée avec sa progression.
          </p>
        )}
        {globalError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-sport-orange/30 bg-sport-orange/10 p-4 text-sm text-sport-orange"
          >
            <strong>Erreur :</strong> {globalError}
          </div>
        )}
        <h2 id="program-form-title" className="sr-only">
          Personnaliser le programme
        </h2>
        <section className="form-section" aria-labelledby="program-practice-title">
          <h2 id="program-practice-title">Votre pratique</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label="Sport"
              name="sport"
              value={formData.sport}
              onChange={(e) => setFormData((prev) => ({ ...prev, sport: e.target.value }))}
              error={errors.sport}
              placeholder="Ex. renforcement, course à pied…"
              required
              maxLength={100}
            />
            <Select
              label="Niveau"
              name="level"
              value={formData.level}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  level: e.target.value as GenerateProgramInput['level'],
                }))
              }
              options={LEVEL_OPTIONS}
              error={errors.level}
              required
            />
          </div>
        </section>
        <section className="form-section" aria-labelledby="program-rhythm-title">
          <h2 id="program-rhythm-title">Votre rythme</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Select
              label="Durée du programme"
              name="weeks_count"
              value={String(formData.weeks_count)}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, weeks_count: Number(e.target.value) }))
              }
              options={WEEKS_OPTIONS}
              error={errors.weeks_count}
              required
            />
            <Select
              label="Séances par semaine"
              name="sessions_per_week"
              value={String(formData.sessions_per_week)}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sessions_per_week: Number(e.target.value) }))
              }
              options={SESSIONS_OPTIONS}
              error={errors.sessions_per_week}
              required
            />
            <Select
              label="Durée par séance"
              name="session_duration_minutes"
              value={String(formData.session_duration_minutes)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  session_duration_minutes: Number(e.target.value),
                }))
              }
              options={DURATION_OPTIONS}
              error={errors.session_duration_minutes}
              required
            />
          </div>
          <p className="flex items-center gap-3 text-sm" aria-live="polite">
            <Icon name="calendar" />
            {formData.weeks_count * formData.sessions_per_week} séances sur {formData.weeks_count}{' '}
            semaines · {formData.session_duration_minutes} min par séance
          </p>
          <p className="muted-copy text-sm">
            Durée indicative par séance : marge de 10 %, jusqu’à 5 minutes.
          </p>
        </section>
        <div className="form-section md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="program-goals" className="field-label">
              Objectifs <span aria-hidden="true">*</span>
              <span className="sr-only"> (requis)</span>
            </label>
            <textarea
              id="program-goals"
              name="goals"
              value={formData.goals}
              onChange={(e) => setFormData((prev) => ({ ...prev, goals: e.target.value }))}
              required
              rows={4}
              maxLength={500}
              placeholder="Ce que vous souhaitez atteindre."
              aria-describedby={errors.goals ? 'goals-error' : undefined}
              aria-invalid={errors.goals ? true : undefined}
              className="field-control resize-y"
            />
            {errors.goals && (
              <p id="goals-error" role="alert" className="text-sm text-sport-orange">
                {errors.goals}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="program-constraints" className="field-label">
              Contraintes et matériel{' '}
              <span className="ml-2 text-sm font-normal text-zinc-300">Facultatif</span>
            </label>
            <textarea
              id="program-constraints"
              name="constraints"
              value={formData.constraints}
              onChange={(e) => setFormData((prev) => ({ ...prev, constraints: e.target.value }))}
              rows={4}
              maxLength={500}
              placeholder="Ex. sans matériel, à la maison, pas de sauts…"
              className="field-control resize-y"
              aria-invalid={errors.constraints ? true : undefined}
              aria-describedby={errors.constraints ? 'constraints-error' : undefined}
            />
            {errors.constraints && (
              <p id="constraints-error" role="alert" className="text-sm text-sport-orange">
                {errors.constraints}
              </p>
            )}
          </div>
        </div>
        <Button
          type="submit"
          isLoading={isLoading}
          size="lg"
          className="w-full"
          disabled={!formReady || isLoading || quotaExhausted}
        >
          {quotaExhausted
            ? 'Quota jury atteint'
            : isLoading
              ? 'Préparation du programme…'
              : 'Générer le programme'}
          {!isLoading && <Icon name="arrow-right" className="ml-auto h-6 w-6" />}
        </Button>
      </fieldset>
    </form>
  );
}
