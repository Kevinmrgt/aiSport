'use client';

import { useState } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { AlcideMascotPrompt } from './AlcideMascotPrompt';
import { GenerationQuotaNotice } from './GenerationQuotaNotice';
import { GlassPanel, MetricPill } from './PremiumPrimitives';
import { GenerateProgramInputSchema } from '@alcide/shared';
import type { GenerateProgramInput } from '@alcide/shared';
import type { GenerationQuota } from '@alcide/shared';
import { isNextRedirectError } from '@/lib/next-navigation';

interface ProgramFormProps {
  onSubmit: (data: GenerateProgramInput) => Promise<{ error?: string } | void>;
  generationQuota: GenerationQuota;
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Debutant' },
  { value: 'intermediate', label: 'Intermediaire' },
  { value: 'advanced', label: 'Avance' },
];

const WEEKS_OPTIONS = [
  { value: '2', label: '2 semaines' },
  { value: '3', label: '3 semaines' },
  { value: '4', label: '4 semaines' },
];

const SESSIONS_OPTIONS = [
  { value: '2', label: '2 seances / semaine' },
  { value: '3', label: '3 seances / semaine' },
  { value: '4', label: '4 seances / semaine' },
  { value: '5', label: '5 seances / semaine' },
];

const DURATION_OPTIONS = [
  { value: '20', label: '20 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
];

export function ProgramForm({ onSubmit, generationQuota }: ProgramFormProps) {
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
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      noValidate
      aria-labelledby="program-form-title"
      className="glass-panel flex w-full flex-col gap-5 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker mb-3">Cycle training</p>
          <h2 id="program-form-title" className="break-words text-3xl font-black text-white">
            Construire la progression
          </h2>
        </div>
        <span className="icon-bubble bg-primary-300 text-zinc-950">
          <Icon name="layers" className="h-4 w-4" />
        </span>
      </div>

      <AlcideMascotPrompt
        title="Je structure ton cycle."
        description="Choisis le rythme et la duree. Je calibre les semaines pour garder une progression nette."
        icon="layers"
      />

      <GenerationQuotaNotice quota={generationQuota} />

      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[1.25rem] border border-primary-300/25 bg-primary-300/10 p-4 text-sm text-primary-100"
        >
          <strong>Programme en preparation.</strong> Chaque semaine est calibree separement.
        </div>
      )}

      {globalError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[1.25rem] border border-sport-orange/30 bg-sport-orange/10 p-4 text-sm text-sport-orange"
        >
          <strong>Erreur :</strong> {globalError}
        </div>
      )}

      <GlassPanel variant="soft" className="grid gap-4 p-4 md:grid-cols-3">
        <Input
          label="Sport"
          name="sport"
          value={formData.sport}
          onChange={(e) => setFormData((prev) => ({ ...prev, sport: e.target.value }))}
          error={errors.sport}
          placeholder="ex: course a pied, natation, musculation..."
          required
          hint="Discipline du cycle"
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
          hint="Experience actuelle"
        />

        <Select
          label="Duree du programme"
          name="weeks_count"
          value={String(formData.weeks_count)}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, weeks_count: Number(e.target.value) }))
          }
          options={WEEKS_OPTIONS}
          error={errors.weeks_count}
          required
          hint="Longueur du cycle"
        />

        <Select
          label="Seances par semaine"
          name="sessions_per_week"
          value={String(formData.sessions_per_week)}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, sessions_per_week: Number(e.target.value) }))
          }
          options={SESSIONS_OPTIONS}
          error={errors.sessions_per_week}
          required
          hint="Rythme hebdomadaire"
        />

        <Select
          label="Duree par seance"
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
          hint="Temps disponible"
        />
      </GlassPanel>

      <div className="grid gap-2 sm:grid-cols-3">
        <MetricPill icon="calendar" label="Cycle" value={`${formData.weeks_count} sem.`} />
        <MetricPill
          icon="activity"
          label="Rythme"
          value={`${formData.sessions_per_week}/sem.`}
          tone="lime"
        />
        <MetricPill
          icon="timer"
          label="Seance"
          value={`${formData.session_duration_minutes} min`}
          tone="orange"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="program-goals" className="field-label">
          Objectifs{' '}
          <span aria-hidden="true" className="text-primary-300">
            *
          </span>
          <span className="sr-only">(requis)</span>
        </label>
        <textarea
          id="program-goals"
          name="goals"
          value={formData.goals}
          onChange={(e) => setFormData((prev) => ({ ...prev, goals: e.target.value }))}
          required
          rows={3}
          placeholder="ex: courir un 10km, gagner en force, perdre du poids..."
          aria-describedby={errors.goals ? 'goals-error' : undefined}
          aria-invalid={errors.goals ? true : undefined}
          className="field-control resize-y"
        />
        {errors.goals && (
          <p id="goals-error" role="alert" className="text-xs text-sport-orange">
            {errors.goals}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="program-constraints" className="field-label">
          Contraintes physiques{' '}
          <span className="text-xs font-normal text-zinc-400">(optionnel)</span>
        </label>
        <textarea
          id="program-constraints"
          name="constraints"
          value={formData.constraints}
          onChange={(e) => setFormData((prev) => ({ ...prev, constraints: e.target.value }))}
          rows={2}
          placeholder="ex: douleur au genou gauche, pas de sauts..."
          className="field-control resize-y"
        />
      </div>

      <Button
        type="submit"
        isLoading={isLoading}
        size="lg"
        className="mt-2 w-full"
        disabled={isLoading || quotaExhausted}
      >
        {quotaExhausted
          ? 'Quota jury atteint'
          : isLoading
            ? 'Preparation du programme...'
            : 'Generer le programme'}
      </Button>
    </form>
  );
}
