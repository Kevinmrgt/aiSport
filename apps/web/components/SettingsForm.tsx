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
      className="flex flex-col gap-6 max-w-lg"
    >
      {success && (
        <div role="status" aria-live="polite" className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Paramètres sauvegardés.
        </div>
      )}
      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* Provider */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ai-provider" className="text-sm font-medium text-zinc-700">
          Fournisseur IA <span aria-hidden="true" className="text-red-600">*</span>
        </label>
        <select
          id="ai-provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as AiProvider);
            setModel('');
          }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Modèle */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ai-model" className="text-sm font-medium text-zinc-700">
          Modèle
        </label>
        <select
          id="ai-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">— Par défaut —</option>
          {currentProvider.models.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Clé API */}
      <div className="flex flex-col gap-1">
        <label htmlFor="api-key" className="text-sm font-medium text-zinc-700">
          Clé API{' '}
          {initial.hasApiKey && initial.provider === provider ? (
            <span className="text-xs font-normal text-green-600">(configurée)</span>
          ) : (
            <span aria-hidden="true" className="text-red-600">*</span>
          )}
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={initial.hasApiKey && initial.provider === provider ? '••••••••••••••• (laisser vide pour conserver)' : 'Votre clé API...'}
          autoComplete="off"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <p className="text-xs text-zinc-400">
          Chiffrée AES-256-GCM côté serveur. Jamais exposée en clair.
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" isLoading={isLoading} size="lg">
          Enregistrer
        </Button>

        {initial.hasApiKey && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            isLoading={isDeleting}
            onClick={() => { void handleDeleteKey(); }}
          >
            Supprimer la clé
          </Button>
        )}
      </div>

      <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-medium text-zinc-700">Comment obtenir une clé API ?</p>
        <p>Mistral AI : console.mistral.ai → API Keys</p>
        <p>OpenAI : platform.openai.com → API Keys</p>
        <p>Anthropic : console.anthropic.com → API Keys</p>
        <p className="pt-1">Sans clé personnelle, la génération utilise la clé serveur Mistral.</p>
      </div>
    </form>
  );
}
