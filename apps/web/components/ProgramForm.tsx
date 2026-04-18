'use client';

import { useState } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { GenerateProgramInputSchema } from '@sportcoach/shared';
import type { GenerateProgramInput } from '@sportcoach/shared';

interface ProgramFormProps {
  onSubmit: (data: GenerateProgramInput) => Promise<{ error?: string } | void>;
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

// RGAA 4.1: formulaire accessible — labels, erreurs, aria-live pour les messages
export function ProgramForm({ onSubmit }: ProgramFormProps) {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);

    // Validation Zod côté client (même schéma que le backend — OWASP A04)
    const parsed = GenerateProgramInputSchema.safeParse({
      ...formData,
      weeks_count: Number(formData.weeks_count),
      sessions_per_week: Number(formData.sessions_per_week),
      session_duration_minutes: Number(formData.session_duration_minutes),
    });

    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const err of parsed.error.errors) {
        const field = err.path[0] as keyof GenerateProgramInput;
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
        error instanceof Error ? error.message : "Une erreur est survenue, veuillez réessayer",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleSubmit(e); }}
      noValidate
      aria-labelledby="program-form-title"
      className="flex flex-col gap-5 w-full max-w-lg"
    >
      <h1 id="program-form-title" className="text-2xl font-bold text-gray-900">
        Générer un programme
      </h1>

      {/* Note de durée — RGAA 4.1: info utile avant le formulaire */}
      {isLoading && (
        <div role="status" aria-live="polite" className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <strong>Génération en cours…</strong> Mistral AI génère chaque semaine de votre programme.
          Cela peut prendre 20 à 40 secondes selon le nombre de semaines.
        </div>
      )}

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
        placeholder="ex: course à pied, natation, musculation..."
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
            level: e.target.value as GenerateProgramInput['level'],
          }))
        }
        options={LEVEL_OPTIONS}
        error={errors.level}
        required
      />

      <Select
        label="Durée du programme"
        name="weeks_count"
        value={String(formData.weeks_count)}
        onChange={(e) => setFormData((prev) => ({ ...prev, weeks_count: Number(e.target.value) }))}
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

      <div className="flex flex-col gap-1">
        {/* RGAA 4.1: textarea avec label explicite */}
        <label htmlFor="program-goals" className="text-sm font-medium text-gray-700">
          Objectifs{' '}
          <span aria-hidden="true" className="text-red-600">*</span>
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
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
        />
        {errors.goals && (
          <p id="goals-error" role="alert" className="text-xs text-red-600">
            <span aria-hidden="true">⚠</span> {errors.goals}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="program-constraints" className="text-sm font-medium text-gray-700">
          Contraintes physiques{' '}
          <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
        </label>
        <textarea
          id="program-constraints"
          name="constraints"
          value={formData.constraints}
          onChange={(e) => setFormData((prev) => ({ ...prev, constraints: e.target.value }))}
          rows={2}
          placeholder="ex: douleur au genou gauche, pas de sauts..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
        />
      </div>

      <Button type="submit" isLoading={isLoading} size="lg" className="mt-2" disabled={isLoading}>
        {isLoading ? 'Génération en cours…' : 'Générer le programme'}
      </Button>
    </form>
  );
}
