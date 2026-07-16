'use client';

import { useState } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { AlcideMascotPrompt } from './AlcideMascotPrompt';
import { GlassPanel, MetricPill } from './PremiumPrimitives';
import { GenerateWorkoutInputSchema } from '@alcide/shared';
import type { GenerateWorkoutInput } from '@alcide/shared';

interface WorkoutFormProps {
  onSubmit: (data: GenerateWorkoutInput) => Promise<{ error?: string } | void>;
  costEstimate: {
    modelLabel: string;
    inputTokens: number;
    outputTokens: number;
    totalUsdLabel: string;
  };
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Debutant' },
  { value: 'intermediate', label: 'Intermediaire' },
  { value: 'advanced', label: 'Avance' },
];

export function WorkoutForm({ onSubmit, costEstimate }: WorkoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof GenerateWorkoutInput, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sport: '',
    level: 'beginner' as GenerateWorkoutInput['level'],
    duration_minutes: 30,
    goals: '',
    constraints: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      return;
    }

    setIsLoading(true);
    try {
      const result = await onSubmit(parsed.data);
      if (result?.error) {
        setGlobalError(result.error);
      }
    } catch (error) {
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
      aria-labelledby="form-title"
      className="glass-panel flex w-full flex-col gap-5 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker mb-3">Brief seance</p>
          <h1 id="form-title" className="break-words text-3xl font-black text-white">
            Construire le training
          </h1>
        </div>
        <span className="icon-bubble bg-primary-300 text-zinc-950">
          <Icon name="zap" className="h-4 w-4" />
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <MetricPill icon="target" label="Modele" value={costEstimate.modelLabel} tone="lime" />
        <MetricPill icon="timer" label="Estime" value={costEstimate.totalUsdLabel} />
        <MetricPill icon="spark" label="Sortie" value="Prete" tone="orange" />
      </div>

      <AlcideMascotPrompt
        title="Je te prepare une seance calibree."
        description="Donne-moi le sport, la duree et ton objectif. Je transforme le brief en training clair."
        icon="zap"
      />

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
          placeholder="ex: course a pied, yoga, musculation..."
          required
          hint="Discipline principale"
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
          hint="Experience actuelle"
        />

        <Input
          label="Duree (minutes)"
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
          hint="Entre 15 et 180 minutes"
        />
      </GlassPanel>

      <div className="flex flex-col gap-1">
        <label htmlFor="goals" className="field-label">
          Objectifs{' '}
          <span aria-hidden="true" className="text-primary-300">
            *
          </span>
          <span className="sr-only">(requis)</span>
        </label>
        <textarea
          id="goals"
          name="goals"
          value={formData.goals}
          onChange={(e) => setFormData((prev) => ({ ...prev, goals: e.target.value }))}
          required
          rows={3}
          placeholder="ex: ameliorer mon endurance, perdre du poids, gagner en force..."
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
        <label htmlFor="constraints" className="field-label">
          Contraintes physiques{' '}
          <span className="text-xs font-normal text-zinc-400">(optionnel)</span>
        </label>
        <textarea
          id="constraints"
          name="constraints"
          value={formData.constraints}
          onChange={(e) => setFormData((prev) => ({ ...prev, constraints: e.target.value }))}
          rows={2}
          placeholder="ex: douleur au genou gauche, pas de sauts..."
          className="field-control resize-y"
        />
      </div>

      <Button type="submit" isLoading={isLoading} size="lg" className="mt-2 w-full">
        {isLoading ? 'Preparation en cours...' : 'Generer la seance'}
      </Button>
    </form>
  );
}
