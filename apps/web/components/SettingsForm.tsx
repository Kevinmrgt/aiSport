'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import type { UserAiSettings, SaveAiSettingsInput } from '@/lib/server-api';

type AiProvider = 'mistral' | 'openai' | 'anthropic';

const PROVIDERS: { value: AiProvider; label: string; models: { value: string; label: string }[] }[] = [
  {
    value: 'mistral',
    label: 'Mistral AI',
    models: [
      { value: 'mistral-small-latest', label: 'Mistral Small (rapide)' },
      { value: 'mistral-large-latest', label: 'Mistral Large (meilleur)' },
    ],
  },
  {
    value: 'openai',
    label: 'OpenAI',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (rapide)' },
      { value: 'gpt-4o', label: 'GPT-4o (meilleur)' },
    ],
  },
  {
    value: 'anthropic',
    label: 'Anthropic (Claude)',
    models: [
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku (rapide)' },
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet (meilleur)' },
    ],
  },
];

interface SettingsFormProps {
  initial: UserAiSettings;
  onSave: (data: SaveAiSettingsInput) => Promise<{ error?: string } | void>;
  onDeleteKey: () => Promise<{ error?: string } | void>;
}

// RGAA 4.1: formulaire accessible avec aria-live
export function SettingsForm({ initial, onSave, onDeleteKey }: SettingsFormProps) {
  const [provider, setProvider] = useState<AiProvider>(initial.provider);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(initial.model ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentProvider = PROVIDERS.find((p) => p.value === provider)!;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!apiKey && !initial.hasApiKey) {
      setError('Veuillez renseigner une clé API.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: SaveAiSettingsInput = { provider, model: model || undefined };
      if (apiKey) payload.apiKey = apiKey;

      const result = await onSave(payload);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setApiKey('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const result = await onDeleteKey();
      if (result?.error) setError(result.error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleSubmit(e); }}
      noValidate
      aria-labelledby="settings-title"
      className="surface flex flex-col gap-6 p-5 sm:p-6"
    >
      {success && (
        <div role="status" aria-live="polite" className="rounded-lg border border-primary-300/25 bg-primary-300/10 p-4 text-sm text-primary-100">
          Paramètres sauvegardés.
        </div>
      )}
      {error && (
        <div role="alert" aria-live="assertive" className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* Provider */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ai-provider" className="field-label">
          Fournisseur IA <span aria-hidden="true" className="text-primary-300">*</span>
        </label>
        <select
          id="ai-provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as AiProvider);
            setModel('');
          }}
          className="field-control"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Modèle */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ai-model" className="field-label">
          Modèle
        </label>
        <select
          id="ai-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="field-control"
        >
          <option value="">— Par défaut —</option>
          {currentProvider.models.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Clé API */}
      <div className="flex flex-col gap-1">
        <label htmlFor="api-key" className="field-label">
          Clé API{' '}
          {initial.hasApiKey && initial.provider === provider ? (
            <span className="text-xs font-normal text-primary-300">(configurée)</span>
          ) : (
            <span aria-hidden="true" className="text-primary-300">*</span>
          )}
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={initial.hasApiKey && initial.provider === provider ? '••••••••••••••• (laisser vide pour conserver)' : 'Votre clé API...'}
          autoComplete="off"
          className="field-control"
        />
        <p className="text-xs text-zinc-400">
          Chiffrée AES-256-GCM côté serveur. Jamais exposée en clair.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" isLoading={isLoading} size="lg" className="w-full sm:w-auto">
          Enregistrer
        </Button>

        {initial.hasApiKey && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            isLoading={isDeleting}
            className="w-full sm:w-auto"
            onClick={() => { void handleDeleteKey(); }}
          >
            Supprimer la clé
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-1">
        <p className="font-bold text-zinc-200">Comment obtenir une clé API ?</p>
        <p>Mistral AI : console.mistral.ai → API Keys</p>
        <p>OpenAI : platform.openai.com → API Keys</p>
        <p>Anthropic : console.anthropic.com → API Keys</p>
        <p className="pt-1">Sans clé personnelle, la génération utilise la clé serveur Mistral.</p>
      </div>
    </form>
  );
}
