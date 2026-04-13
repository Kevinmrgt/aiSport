# ADR-003 — Mistral AI pour la génération d'entraînements

**Date** : 2026-04-13
**Statut** : Accepté
**Auteur** : Kevin

## Contexte

La fonctionnalité centrale de SportCoach IA est la génération de programmes d'entraînement personnalisés par IA. Il faut choisir un fournisseur d'API LLM qui permette de générer des réponses JSON structurées, fiables et validables.

## Options envisagées

| Fournisseur | Avantages | Inconvénients |
|---|---|---|
| **Mistral AI** | Tier gratuit disponible, JSON mode, modèles open-weights | Moins connu qu'OpenAI |
| OpenAI GPT-4o | Référence du marché, JSON mode fiable | Coût élevé, pas de tier gratuit |
| Google Gemini | Tier gratuit généreux | JSON mode moins stable |
| Modèle local (Ollama) | Gratuit, privé | Ressources serveur importantes, lenteur |

## Décision

**Mistral AI** — API avec `response_format: { type: "json_object" }` et validation Zod stricte côté backend.

## Justification

1. **Tier gratuit** : adapté à un projet de certification sans budget infrastructure.
2. **JSON mode natif** : `response_format: json_object` force Mistral à retourner du JSON valide, réduisant les erreurs de parsing.
3. **Qualité** : `mistral-small-latest` offre une qualité suffisante pour des programmes sportifs.
4. **Sécurité** : la clé API ne transite jamais côté client (OWASP A02) — l'appel passe toujours par le backend Hono.

## Contrat technique

La réponse Mistral est validée par le schéma Zod `WorkoutSchema` défini dans `packages/shared`. Si la validation échoue, un retry est effectué avec un prompt plus explicite. Après 2 échecs, une erreur propre est retournée à l'utilisateur.

```typescript
// Retry 1 fois max avec prompt renforcé (mistral-contract.md)
const validated = WorkoutSchema.safeParse(parsed);
if (!validated.success && attempt === 1) {
  // retry avec prompt plus explicite
}
```

## Mesures de sécurité

- `MISTRAL_API_KEY` uniquement en variable d'environnement (jamais dans le code)
- Timeout de 30 secondes sur chaque appel (OWASP A10 — SSRF protection)
- Log structuré de chaque appel (durée, succès, tokens) — OWASP A09

## Conséquences

- Si Mistral change son pricing, migrer vers OpenAI ou Gemini ne nécessite que de modifier `MistralService` — les couches supérieures sont découplées.
- Le schéma Zod partagé est le contrat unique — tout changement doit être rétro-compatible.
