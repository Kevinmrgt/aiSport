'use client';

import { useState } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { GenerateWorkoutInputSchema } from '@sportcoach/shared';
import type { GenerateWorkoutInput } from '@sportcoach/shared';

interface WorkoutFormProps {
  onSubmit: (data: GenerateWorkoutInput) => Promise<void>;
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

// RGAA 4.1: formulaire accessible — labels, erreurs, aria-live pour les messages
export function WorkoutForm({ onSubmit }: WorkoutFormProps) {
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

    // Validation Zod côté client (même schéma que le backend — OWASP A04)
    const parsed = GenerateWorkoutInputSchema.safeParse({
      ...formData,
      duration_minutes: Number(formData.duration_minutes),
    });

    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const err of parsed.error.errors) {
        const field = err.path[0] as keyof GenerateWorkoutInput;
        if (field) fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setGlobalError(
        error instanceof Error ? error.message : "Une erreur est survenue, veuillez réessayer",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // RGAA 4.1: formulaire avec aria-labelledby
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="form-title"
      className="flex flex-col gap-5 w-full max-w-lg"
    >
      <h1 id="form-title" className="text-2xl font-bold text-gray-900">
        Générer un entraînement
      </h1>

      {/* RGAA 4.1: message d'erreur global avec aria-live */}
      {globalError && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <strong>Erreur :</strong> {globalError}
        </div>
      )}

      <Input
        label="Sport"
        name="sport"
        value={formData.sport}
        onChange={(e) => setFormData((prev) => ({ ...prev, sport: e.target.value }))}
        error={errors.sport}
        placeholder="ex: course à pied, yoga, musculation..."
        required
        hint="Le sport pour lequel vous souhaitez un programme"
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
        hint="Entre 15 et 180 minutes"
      />

      <div className="flex flex-col gap-1">
        {/* RGAA 4.1: textarea avec label explicite */}
        <label htmlFor="goals" className="text-sm font-medium text-gray-700">
          Objectifs{' '}
          <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(requis)</span>
        </label>
        <textarea
          id="goals"
          name="goals"
          value={formData.goals}
          onChange={(e) => setFormData((prev) => ({ ...prev, goals: e.target.value }))}
          required
          rows={3}
          placeholder="ex: améliorer mon endurance, perdre du poids, gagner en force..."
          aria-describedby={errors.goals ? 'goals-error' : undefined}
          aria-invalid={errors.goals ? true : undefined}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
        />
        {errors.goals && (
          <p id="goals-error" role="alert" className="text-xs text-red-600">
            <span aria-hidden="true">⚠</span> {errors.goals}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="constraints" className="text-sm font-medium text-gray-700">
          Contraintes physiques{' '}
          <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
        </label>
        <textarea
          id="constraints"
          name="constraints"
          value={formData.constraints}
          onChange={(e) => setFormData((prev) => ({ ...prev, constraints: e.target.value }))}
          rows={2}
          placeholder="ex: douleur au genou gauche, pas de sauts..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
        />
      </div>

      <Button type="submit" isLoading={isLoading} size="lg" className="mt-2">
        {isLoading ? 'Génération en cours...' : "Générer l'entraînement"}
      </Button>
    </form>
  );
}
