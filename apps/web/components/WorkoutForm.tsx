'use client';

import { useState } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { useFormReady } from './useFormReady';
import { Icon } from './ui/Icon';
import { GenerationQuotaNotice } from './GenerationQuotaNotice';
import { WorkoutGenerationProgress } from './WorkoutGenerationProgress';
import { GenerateWorkoutInputSchema } from '@alcide/shared';
import type { GenerateWorkoutInput } from '@alcide/shared';
import type { GenerationQuota } from '@alcide/shared';
import { isNextRedirectError } from '@/lib/next-navigation';

interface WorkoutFormProps {
  onSubmit: (data: GenerateWorkoutInput) => Promise<{ error?: string } | void>;
  generationQuota: GenerationQuota;
  initialValues?: { goals?: string; duration_minutes?: number };
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

export function WorkoutForm({ onSubmit, generationQuota, initialValues }: WorkoutFormProps) {
  const formReady = useFormReady();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof GenerateWorkoutInput, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sport: '',
    level: 'beginner' as GenerateWorkoutInput['level'],
    duration_minutes: initialValues?.duration_minutes ?? 30,
    goals: initialValues?.goals ?? '',
    constraints: '',
  });
  const quotaExhausted = generationQuota.limited && generationQuota.remaining === 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formReady || isLoading || quotaExhausted) return;
    setErrors({});
    setGlobalError(null);

    const parsed = GenerateWorkoutInputSchema.safeParse({
      ...formData,
      duration_minutes: Number(formData.duration_minutes),
    });

    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const err of parsed.error.issues) {
        const field = err.path[0] as keyof GenerateWorkoutInput;
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
      aria-labelledby="form-title"
      className="glass-panel form-panel"
    >
      <h2 id="form-title" className="sr-only">
        Personnaliser la séance
      </h2>
      {isLoading && (
        <WorkoutGenerationProgress
          sport={formData.sport}
          durationMinutes={formData.duration_minutes}
        />
      )}
      <fieldset
        disabled={!formReady || isLoading}
        className={isLoading ? 'hidden' : 'contents'}
        hidden={isLoading}
      >
        <GenerationQuotaNotice quota={generationQuota} />
        {globalError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-sport-orange/30 bg-sport-orange/10 p-4 text-sm text-sport-orange"
          >
            <strong>Erreur :</strong> {globalError}
          </div>
        )}
        <div className="form-section md:grid-cols-3">
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
                level: e.target.value as GenerateWorkoutInput['level'],
              }))
            }
            options={LEVEL_OPTIONS}
            error={errors.level}
            required
          />
          <Input
            label="Durée (minutes)"
            name="duration_minutes"
            type="number"
            min={15}
            max={180}
            value={formData.duration_minutes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))
            }
            error={errors.duration_minutes}
            required
            hint="Entre 15 et 180 minutes. Durée indicative : marge de 10 %, jusqu’à 5 minutes."
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="goals" className="field-label">
            Objectifs <span aria-hidden="true">*</span>
            <span className="sr-only"> (requis)</span>
          </label>
          <textarea
            id="goals"
            name="goals"
            value={formData.goals}
            onChange={(e) => setFormData((prev) => ({ ...prev, goals: e.target.value }))}
            required
            rows={3}
            maxLength={500}
            placeholder="Ce que vous souhaitez travailler ou améliorer."
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
          <label htmlFor="constraints" className="field-label">
            Contraintes et matériel{' '}
            <span className="ml-2 text-sm font-normal text-zinc-300">Facultatif</span>
          </label>
          <textarea
            id="constraints"
            name="constraints"
            value={formData.constraints}
            onChange={(e) => setFormData((prev) => ({ ...prev, constraints: e.target.value }))}
            rows={3}
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
        <div className="form-footer">
          <p className="muted-copy text-sm">Sport, niveau, durée et objectifs sont requis.</p>
          <Button
            type="submit"
            isLoading={isLoading}
            size="lg"
            className="w-full sm:w-auto sm:min-w-64"
            disabled={!formReady || isLoading || quotaExhausted}
          >
            {quotaExhausted
              ? 'Quota jury atteint'
              : isLoading
                ? 'Préparation en cours…'
                : 'Générer la séance'}
            {!isLoading && <Icon name="arrow-right" className="ml-4 h-6 w-6" />}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
