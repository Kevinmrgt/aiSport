# Modèle de fiche anomalie Bloc 4 - SportCoach IA

> Projet : **SportCoach IA / aiSport**  
> Bloc RNCP39583 : **Maintenir l'application logicielle en condition opérationnelle**  
> Usage : modèle réutilisable pour consigner une anomalie, un incident ou un bug.

---

## Fiche anomalie

| Champ | Valeur |
|---|---|
| ID | `BUG-XXX` |
| Titre |  |
| Date de détection | `YYYY-MM-DD` |
| Détecté par | Utilisateur / support / mainteneur / CI / monitoring / audit |
| Environnement | Local / CI / Preview / Production |
| Composant | Web / API / DB / IA / Auth / CI-CD / Documentation / Sécurité |
| Version concernée | `0.x.x` ou `Unreleased` |
| Criticité | P0 Critique / P1 Haute / P2 Moyenne / P3 Faible |
| Statut | Détectée / Qualifiée / En analyse / À corriger / En validation / Résolue / Clôturée / Rejetée |
| Responsable correction |  |
| Responsable validation |  |

---

## 1. Description

Résumé court du problème observé.

```text
Décrire ce qui ne fonctionne pas, où, depuis quand, et dans quel contexte.
```

---

## 2. Contexte

| Élément | Détail |
|---|---|
| URL ou route |  |
| Commande ou workflow |  |
| Navigateur / runtime |  |
| Données de test |  |
| Dernier changement connu |  |
| Fréquence | Systématique / fréquente / rare / non reproduite |

---

## 3. Étapes de reproduction

1. 
2. 
3. 
4. 

Commande si applicable :

```bash

```

---

## 4. Résultat attendu

```text
Décrire le comportement normal attendu.
```

---

## 5. Résultat obtenu

```text
Décrire le comportement réellement observé.
Inclure le message d'erreur exact si disponible.
```

Logs ou extrait :

```text

```

---

## 6. Impact

| Axe | Impact |
|---|---|
| Utilisateur | Aucun / limité / majeur / bloquant |
| Sécurité | Aucun / potentiel / confirmé |
| Données | Aucun / risque de perte / perte confirmée |
| Disponibilité | Aucun / partiel / total |
| CI/CD | Aucun / workflow bloqué / déploiement bloqué |
| RNCP / démonstration | Aucun / gêne / preuve critique impactée |

Synthèse d'impact :

```text

```

---

## 7. Qualification et priorisation

| Critère | Évaluation |
|---|---|
| Criticité retenue | P0 / P1 / P2 / P3 |
| Justification |  |
| Contournement possible | Oui / Non |
| Description du contournement |  |
| Décision | Corriger immédiatement / planifier / surveiller / rejeter |

---

## 8. Analyse de cause racine

Cause racine identifiée :

```text

```

Hypothèses écartées :

| Hypothèse | Pourquoi écartée |
|---|---|
|  |  |

Fichiers ou composants concernés :

| Fichier / service | Rôle dans l'anomalie |
|---|---|
|  |  |

---

## 9. Correctif

Description du correctif :

```text

```

Type de correction :

- [ ] Code applicatif
- [ ] Configuration
- [ ] Variable d'environnement / secret
- [ ] Migration DB
- [ ] Documentation
- [ ] Test
- [ ] Rollback
- [ ] Contournement temporaire

Fichiers modifiés :

| Fichier | Modification |
|---|---|
|  |  |

---

## 10. Tests réalisés

| Test | Commande ou méthode | Résultat |
|---|---|---|
| Lint | `pnpm lint` |  |
| Typecheck | `pnpm typecheck` |  |
| Tests unitaires | `pnpm test` |  |
| Coverage | `pnpm test:coverage` |  |
| Build | `pnpm build` |  |
| E2E smoke | `pnpm test:e2e:smoke` |  |
| Healthcheck API | `curl https://ai-sport-api.vercel.app/health` |  |
| Healthcheck Web | `curl https://ai-sport-web.vercel.app/api/health` |  |
| Test manuel |  |  |

Test de non-régression spécifique :

```text

```

---

## 11. Déploiement ou rollback

| Élément | Valeur |
|---|---|
| Correctif déployé ? | Oui / Non / Non applicable |
| Mode | CI/CD Vercel / manuel / rollback / local uniquement |
| Workflow |  |
| Déploiement Vercel |  |
| Migration DB | Oui / Non |
| Backup ou branche Neon | Oui / Non / Non applicable |
| Validation post-déploiement |  |

---

## 12. Version corrigée

| Champ | Valeur |
|---|---|
| Version corrigée | `0.x.x` ou `Unreleased` |
| Entrée changelog | Oui / Non |
| Lien changelog | [CHANGELOG.md](../../CHANGELOG.md) |

---

## 13. Liens vers preuves

| Type de preuve | Lien |
|---|---|
| Fichier source |  |
| Commit |  |
| Pull request |  |
| Workflow CI/CD |  |
| Logs |  |
| Capture |  |
| Ticket support |  |
| Documentation associée |  |

---

## 14. Communication support

Cette section est obligatoire si l'anomalie provient d'un retour utilisateur ou support.

| Élément | Valeur |
|---|---|
| Retour initial |  |
| Réponse envoyée |  |
| Date de réponse |  |
| Validation utilisateur | Oui / Non / En attente |
| Message de clôture |  |

Si l'exemple est simulé pour le dossier RNCP, l'indiquer explicitement :

```text
Exemple simulé faute de support client réel disponible dans le projet.
```

---

## 15. Leçons apprises et prévention

Leçon apprise :

```text

```

Actions préventives :

- [ ] Ajouter ou renforcer un test
- [ ] Ajouter une alerte
- [ ] Mettre à jour le runbook
- [ ] Mettre à jour la documentation utilisateur
- [ ] Mettre à jour le processus CI/CD
- [ ] Ajouter une vérification de configuration
- [ ] Autre :

---

## 16. Clôture

| Champ | Valeur |
|---|---|
| Statut final | Résolue / Clôturée / Rejetée |
| Date de clôture | `YYYY-MM-DD` |
| Validé par |  |
| Commentaire final |  |

Checklist de clôture :

- [ ] Description complète.
- [ ] Impact et criticité renseignés.
- [ ] Cause racine renseignée ou justification si inconnue.
- [ ] Correctif ou contournement décrit.
- [ ] Tests réalisés listés.
- [ ] Version corrigée ou statut `Unreleased` renseigné.
- [ ] Liens de preuve ajoutés.
- [ ] Changelog mis à jour si nécessaire.
- [ ] Communication support réalisée si applicable.
