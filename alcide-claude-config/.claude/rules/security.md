---
description: Sécurité OWASP Top 10 — COMPÉTENCE ÉLIMINATOIRE RNCP
globs: "*.ts,*.tsx"
---

# Sécurité — OWASP Top 10

⚠️ COMPÉTENCE ÉLIMINATOIRE (C2.2.3) — le jury vérifiera la couverture des 10 failles OWASP.

Chaque feature DOIT respecter :

1. **A01 Contrôle d'accès** : middleware Auth.js sur les routes protégées, vérifier que l'utilisateur accède uniquement à SES données
2. **A02 Cryptographie** : HTTPS, secrets en variables d'env uniquement, jamais de clé en dur
3. **A03 Injection** : Drizzle ORM (requêtes paramétrées), jamais de SQL brut, valider avec Zod
4. **A04 Conception non sécurisée** : validation Zod côté serveur systématique, ne jamais faire confiance au client
5. **A05 Mauvaise configuration** : .env.local jamais commitée, headers de sécurité (CORS restrictif, CSP)
6. **A06 Composants vulnérables** : `npm audit` en CI, Dependabot activé
7. **A07 Authentification** : sessions Auth.js sécurisées, CSRF tokens, expiration
8. **A08 Intégrité** : SRI pour les CDN, Content-Security-Policy
9. **A09 Journalisation** : structured logging, logs des erreurs et tentatives d'accès non autorisées
10. **A10 SSRF** : valider/restreindre les URLs d'appel à Mistral

Quand tu appliques une mesure de sécurité, ajoute un commentaire : `// OWASP: A0X — description`
