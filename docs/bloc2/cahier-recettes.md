# Cahier de Recettes — SportCoach IA

> Livrable RNCP Bloc 2 — Compétence C2.3.1 (ÉLIMINATOIRE)

## Format

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-XXX | Nom | Conditions préalables | Étapes à suivre | Ce qui devrait se passer | Ce qui s'est passé | ✅ / ❌ / 🔄 |

---

## Authentification

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-001 | Connexion OAuth GitHub | Aucune session active | 1. Aller sur `/login` 2. Cliquer "Continuer avec GitHub" 3. Autoriser l'application sur GitHub | Redirection vers `/generate`, session créée | À tester | 🔄 |
| CR-002 | Accès route protégée sans session | Aucune session active | 1. Aller directement sur `/generate` | Redirection automatique vers `/login` | À tester | 🔄 |
| CR-003 | Déconnexion | Session active | 1. Cliquer "Déconnexion" | Session supprimée, redirection vers `/` | À tester | 🔄 |

---

## Génération d'entraînement

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-010 | Générer un entraînement valide | Utilisateur connecté | 1. Aller sur `/generate` 2. Remplir sport: "Course", niveau: "Débutant", durée: 30min, objectifs: "Endurance" 3. Soumettre | Entraînement généré et affiché en < 30s | À tester | 🔄 |
| CR-011 | Validation formulaire — champ vide | Utilisateur connecté | 1. Soumettre le formulaire sans remplir le champ "Sport" | Message d'erreur sous le champ, pas d'appel API | À tester | 🔄 |
| CR-012 | Validation formulaire — durée invalide | Utilisateur connecté | 1. Saisir durée = 5 minutes (< minimum) 2. Soumettre | Message d'erreur "Durée minimum 15 minutes" | À tester | 🔄 |
| CR-013 | Erreur API Mistral | API Mistral indisponible | 1. Générer un entraînement avec l'API coupée | Message d'erreur clair "Impossible de générer l'entraînement, veuillez réessayer" | À tester | 🔄 |

---

## Consultation et Timer

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-020 | Liste des entraînements | Utilisateur connecté, au moins 1 workout | 1. Aller sur `/workouts` | Liste des entraînements de l'utilisateur connecté uniquement | À tester | 🔄 |
| CR-021 | Accès entraînement d'un autre utilisateur | 2 comptes utilisateurs | 1. Se connecter avec compte A 2. Tenter d'accéder à l'ID d'un workout du compte B | Erreur 403 — accès refusé | À tester | 🔄 |
| CR-022 | Démarrer le timer | Page de détail d'un workout | 1. Cliquer "Démarrer" | Timer démarre, décompte visible, exercice affiché | À tester | 🔄 |
| CR-023 | Pause/Reprise timer | Timer en cours | 1. Cliquer "Pause" 2. Cliquer "Reprendre" | Timer se met en pause puis reprend au bon moment | À tester | 🔄 |
| CR-024 | Passage automatique à l'exercice suivant | Timer en cours | 1. Laisser le timer arriver à 0 | Phase repos démarrée, puis exercice suivant automatiquement | À tester | 🔄 |
| CR-025 | Accessibilité navigation clavier | Aucune | 1. Naviguer sur tout le site avec Tab uniquement | Tous les éléments interactifs accessibles, focus visible | À tester | 🔄 |

---

## Sécurité

| ID | Fonctionnalité | Préconditions | Actions | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|---|---|
| CR-030 | Injection SQL tentée | - | 1. Saisir `'; DROP TABLE workouts; --` dans le champ sport | Validation Zod bloque, aucun SQL exécuté (Drizzle ORM) | À tester | 🔄 |
| CR-031 | XSS tentée | - | 1. Saisir `<script>alert('xss')</script>` dans les objectifs | Script non exécuté (React échappe automatiquement) | À tester | 🔄 |
| CR-032 | Clé API Mistral côté client | DevTools réseau | 1. Générer un workout 2. Inspecter les requêtes réseau depuis le navigateur | La clé API Mistral n'apparaît dans aucune requête client | À tester | 🔄 |
