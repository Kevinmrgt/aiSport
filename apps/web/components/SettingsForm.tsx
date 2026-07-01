'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { GlassPanel, MetricPill } from './PremiumPrimitives';
import { estimateWorkoutGenerationCost } from '@/lib/ai-pricing';
import type { UserAiSettings, SaveAiSettingsInput } from '@/lib/server-api';

const OPENAI_MODELS = [
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini (rapide)' },
  { value: 'gpt-5.4', label: 'GPT-5.4 (qualite)' },
  { value: 'gpt-5.5', label: 'GPT-5.5 (expert)' },
] as const;

interface SettingsFormProps {
  initial: UserAiSettings;
  onSave: (data: SaveAiSettingsInput) => Promise<{ error?: string } | void>;
}

export function SettingsForm({ initial, onSave }: SettingsFormProps) {
  const [model, setModel] = useState(initial.model ?? 'gpt-5.4-mini');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const costEstimate = estimateWorkoutGenerationCost(model);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    setIsLoading(true);
    try {
      const payload: SaveAiSettingsInput = { model: model || undefined };
      const result = await onSave(payload);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
      aria-labelledby="settings-title"
      className="glass-panel flex flex-col gap-6 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker mb-3">Moteur</p>
          <h2 className="text-3xl font-black text-white">Controle generation</h2>
        </div>
        <span className="icon-bubble bg-primary-300 text-zinc-950">
          <Icon name="settings" className="h-4 w-4" />
        </span>
      </div>

      {success && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[1.25rem] border border-primary-300/25 bg-primary-300/10 p-4 text-sm text-primary-100"
        >
          Parametres sauvegardes.
        </div>
      )}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[1.25rem] border border-sport-orange/30 bg-sport-orange/10 p-4 text-sm text-sport-orange"
        >
          <strong>Erreur :</strong> {error}
        </div>
      )}

      <GlassPanel variant="soft" className="p-4">
        <p className="font-bold text-primary-100">OpenAI cote serveur</p>
        <p className="muted-copy mt-1">
          La cle API reste geree par l API. L interface expose seulement le choix du modele et une
          estimation de cout.
        </p>
      </GlassPanel>

      <div className="flex flex-col gap-1">
        <label htmlFor="ai-model" className="field-label">
          Modele OpenAI
        </label>
        <select
          id="ai-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="field-control"
        >
          {OPENAI_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <MetricPill icon="spark" label="Modele" value={costEstimate.modelLabel} tone="lime" />
        <MetricPill icon="target" label="Prix" value={costEstimate.totalUsdLabel} />
        <MetricPill icon="timer" label="Budget" value="Estime" tone="orange" />
      </div>

      <Button type="submit" isLoading={isLoading} size="lg" className="w-full sm:w-auto">
        Enregistrer
      </Button>

      <div className="space-y-1 rounded-[1.25rem] border border-white/10 bg-zinc-950/[0.45] p-4 text-xs text-zinc-400">
        <p className="font-bold text-zinc-200">Transparence cout</p>
        <p>Le prix affiche est un ordre de grandeur calcule depuis les tarifs API OpenAI.</p>
        <p>Le cout reel varie selon la longueur du prompt, la reponse et les tarifs en vigueur.</p>
      </div>
    </form>
  );
}
