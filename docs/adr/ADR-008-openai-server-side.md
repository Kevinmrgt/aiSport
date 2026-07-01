# ADR-008 - OpenAI cote serveur pour la generation IA

**Date** : 2026-06-30  
**Statut** : Accepte  
**Remplace** : ADR-003 pour la decision fournisseur IA courante  
**Note RNCP** : cette ADR documente l'etat applicatif post-presentation Bloc 1 ; les supports Bloc 1 deja presentes restent figes.

## Contexte

Alcide genere des seances et programmes sportifs personnalises. La decision produit actuelle est de simplifier l'experience utilisateur et de proteger les secrets : l'utilisateur ne doit pas fournir de cle API ni choisir de fournisseur IA.

## Decision

OpenAI est le seul fournisseur IA expose par l'application. La cle `OPENAI_API_KEY` est configuree cote serveur par Alcide, dans l'environnement API. Elle n'est jamais stockee comme donnee utilisateur, jamais envoyee au navigateur et jamais demandee dans l'interface.

## Consequences techniques

- `apps/api/src/services/ai.service.ts` appelle uniquement l'endpoint OpenAI cote serveur.
- `apps/api/src/controllers/settings.controller.ts` resout toujours `provider: 'openai'` et lit la cle depuis `OPENAI_API_KEY`.
- `apps/web/components/SettingsForm.tsx` permet seulement de choisir le modele OpenAI, pas un fournisseur ni une cle.
- La table `user_settings` conserve les colonnes historiques `ai_provider` et `ai_api_key_encrypted` pour compatibilite, mais le code force `ai_provider = 'openai'` et `ai_api_key_encrypted = NULL`.
- La migration `0004_openai_only_settings.sql` nettoie les anciennes valeurs.

## Mesures de securite

- Secret OpenAI uniquement en variable d'environnement serveur.
- Aucun champ de cle API dans le frontend.
- Validation Zod des sorties IA avant sauvegarde dans `workout-ai.service.ts` et `program-ai.service.ts`.
- Timeout, retry limite et erreurs utilisateur propres.
- Rate limiting utilisateur pour maitriser le cout et l'abus.

## Impact RNCP

Cette decision aligne le code avec le support Bloc 1 : "la cle API appartient a Alcide". Pour le Bloc 2, les controles a prouver sont donc :

- `OPENAI_API_KEY` configuree en environnement serveur ;
- absence de cle OpenAI dans les requetes navigateur ;
- generation valide via service backend ;
- erreur propre si la cle serveur manque ou si OpenAI est indisponible ;
- tests unitaires de validation, retry, timeout et erreur fournisseur.
