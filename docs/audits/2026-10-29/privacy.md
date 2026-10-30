# Audit vie privée et préparation juridique — 29 octobre 2026

Responsable : agent vie privée dédié. Révision locale examinée : `cb9037fcc52626f4f8191621f7c5b4693a76c2d7`, branche `codex/nettoyage-projet`. Les constats de code portent sur cette révision. Les observations HTTP publiques ci-dessous portent sur le service effectivement accessible ; elles n'identifient pas son SHA. L'audit UX coordonné signale une interface distante divergente avec tarifs/crédits/Premium et accès jury/bêta : aucune conclusion juridique de ce rapport sur le candidat local ne vaut qualification de cette offre distante. Aucun compte, secret ou contenu de base utilisateur n'a été consulté.

## Conclusion

L'ouverture publique exige de terminer le cadre des données personnelles : information et contact, traitement des informations de santé sollicitées, conservation, exercice effectif des droits et preuves relatives aux prestataires. La page de confidentialité reconnaît honnêtement plusieurs limites du prototype ; elle ne les résout pas. Aucun P0 ni fuite de données n'a été démontré dans ce périmètre.

P1 signifie ici condition de préparation avant ouverture publique. P2 signifie complément à qualifier ou amélioration. Un document contractuel absent du dépôt est une preuve à obtenir, pas la preuve qu'aucun contrat n'existe.

## Cartographie constatée

| Flux                                  | Preuve dans le candidat                                                                          | Observation                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identité Google → Web/API/PostgreSQL  | `apps/web/lib/auth.ts:7`, `apps/api/src/middleware/auth.middleware.ts:37`                        | Identifiant, nom et e-mail ; sessions JWT de 30 jours, `auth.ts:30`. L'identité persistée par e-mail est traitée dans l'audit sécurité.                           |
| Objectifs et contraintes → OpenAI     | `apps/api/src/services/workout-ai.service.ts:40`, `program-ai.service.ts:33`, `ai.service.ts:65` | Le texte libre entre dans le prompt. Aucun nom/e-mail n'est ajouté par ces fonctions. L'utilisateur peut néanmoins y écrire des données personnelles ou de santé. |
| Entraînements/programmes → PostgreSQL | `apps/api/src/db/schema.ts:61`, `:85`                                                            | Sorties IA stockées en JSONB, liées au compte. Ne pas supposer qu'une sortie IA est dépourvue d'informations personnelles reprises du prompt.                     |
| Retour de séance → PostgreSQL         | `apps/api/src/controllers/session-log.controller.ts:47`, `apps/api/src/db/schema.ts:111`         | Durée, effort, ressenti, notes et douleur. Ces notes ne sont pas réutilisées dans les prompts inspectés.                                                          |
| Prestataires et hébergement           | `docs/deployment.md:5`, `apps/api/src/services/ai.service.ts:65`                                 | Configuration Vercel, Neon et OpenAI ; Google pour OAuth. Régions, contrats et réglages réels des comptes non vérifiés.                                           |

## Constats et critères de correction

### PRIV-01 — P1 — L'information publique ne permet pas d'identifier et contacter le responsable ni de connaître les bases légales

**Preuve.** `apps/web/app/confidentialite/page.tsx:47` décrit les finalités, mais ne précise pas de base légale par traitement. Les lignes 83–89 renvoient au canal privé ayant transmis l'accès et reconnaissent l'absence d'adresse dédiée. La page ne donne pas l'identité du responsable, de durée déterminée ni le droit de réclamation à la CNIL.

**Impact.** Un nouvel utilisateur public ne dispose pas des informations nécessaires pour comprendre et exercer ses droits. Les mentions attendues et leur présentation au moment de la collecte sont détaillées par la [CNIL sur la transparence](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence).

**Action / responsable.** Responsable du projet avec référent juridique : nommer le responsable, publier un contact fonctionnel, établir les finalités et leur fondement approprié, compléter droits, durées, destinataires et éventuels transferts. Une base contractuelle pour le service principal reste une qualification à justifier ; elle ne règle pas le régime des données sensibles. Ajouter des informations courtes aux formulaires concernés.

**Acceptation.** Notice finalisée accessible sans session depuis connexion et formulaires ; identité/contact réels validés par le propriétaire ; chaque flux du tableau relié à une finalité, une base légale et une règle de conservation. Aucune coordonnée ne doit être inventée.

### PRIV-02 — P1 — La collecte de douleur et de contraintes médicales n'a pas de cadre spécifique démontré

**Preuve.** `apps/web/components/SessionCompletionForm.tsx:145` sollicite une douleur, une zone et une intensité. `WorkoutForm.tsx:186` et `ProgramForm.tsx:264` invitent explicitement à décrire une douleur au genou. Ces contraintes sont envoyées à OpenAI par les fonctions de prompt citées plus haut. Aucun recueil spécifique de consentement ni autre exception au régime des données sensibles n'apparaît dans ces parcours ou leur schéma de stockage. La notice indique seulement le caractère facultatif et la limite médicale (`confidentialite/page.tsx:60`).

**Qualification.** Toute donnée de sport n'est pas une donnée de santé. Un texte révélant une blessure ou un état pathologique peut l'être ; les exemples proposés par les formulaires rendent ce cas prévisible. Les [articles 6 et 9 du RGPD](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre2) imposent de traiter séparément fondement général et exception autorisant ces données. La [CNIL pour les données de santé des sportifs](https://www.cnil.fr/fr/sportifs-quels-cas-et-conditions-collecte-des-donnees-de-sante) souligne nécessité, minimisation et consentement explicite lorsqu'il est retenu.

**Action / responsable.** Produit, backend et référent juridique : décider de retirer cette collecte pour la première ouverture, ou justifier les données indispensables et mettre en œuvre un mécanisme valable, spécifique et traçable. Si le consentement explicite est choisi, permettre refus/retrait sans pénalité, couvrir distinctement les usages et destinataires, et contrôler les API autant que l'interface. Une simple acceptation générale des CGU ou la saisie facultative ne suffit pas à démontrer ce cadre.

**Acceptation.** Décision de qualification écrite ; tests démontrant absence de collecte/transmission si retirée, ou refus, consentement, retrait et effacement effectifs si conservée ; preuve du consentement limitée aux éléments utiles. Un utilisateur doit pouvoir utiliser les fonctions ne nécessitant pas ces données en refusant ce traitement.

### PRIV-03 — P1 — Conservation illimitée annoncée et cycle de purge absent

**Preuve.** `confidentialite/page.tsx:71` annonce qu'aucune durée automatique n'est configurée et que les données restent tant que le responsable ne les supprime pas. Les routes inscrites dans `apps/api/src/routes/index.ts:9` ne proposent pas de gestion de ce cycle. La suppression d'un entraînement ou programme conserve les journaux par `ON DELETE SET NULL` (`apps/api/src/db/schema.ts:121`) : les notes, dont la douleur, restent liées à l'utilisateur. Cette conservation peut servir l'historique ; elle doit être expliquée et bornée.

**Règle.** Les durées se déterminent à partir des finalités ; il n'existe pas un délai universel à recopier pour cette application. La [CNIL, durées de conservation, actualisée le 2 avril 2026](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees) distingue données actives, éventuel archivage justifié et suppression.

**Action / responsable.** Responsable des traitements et backend/exploitation : fixer et justifier les durées par catégorie, l'inactivité, les journaux techniques et les sauvegardes ; automatiser la purge appropriée ; prévoir le traitement des effacements lors d'une restauration. Clarifier la différence entre supprimer une séance et effacer ses données personnelles.

**Acceptation.** Règles datées publiées ; essai sur données synthétiques expirées incluant comptes, entraînements, journaux, notes et sauvegardes ; preuve qu'une restauration ne remet pas durablement en circulation des données effacées ; absence de conservation implicite sans fin.

### PRIV-04 — P1 — Le canal et la procédure d'exercice des droits ne sont pas opérationnels pour un public ouvert

**Preuve.** La notice reconnaît l'absence d'export global et de suppression du compte (`confidentialite/page.tsx:83`). Aucune route correspondante n'est inscrite dans `routes/index.ts:9` et aucune procédure dédiée n'a été trouvée dans la documentation inspectée. Le schéma prévoit des cascades lors de la suppression d'un utilisateur (`schema.ts:117`), mais aucun parcours ou exercice réel de suppression globale n'a été vérifié.

**Impact.** L'absence de boutons de libre-service n'est pas, à elle seule, une infraction. Un canal et une procédure effective peuvent être manuels. Le problème constaté est l'absence de dispositif public documenté et testé. La [CNIL sur l'effacement](https://www.cnil.fr/fr/comprendre-mes-droits/le-droit-leffacement-supprimer-vos-donnees-en-ligne) et la [CNIL sur la portabilité](https://www.cnil.fr/fr/respecter-les-droits-des-personnes/professionnels-comment-repondre-une-demande-de-droit-la-portabilite) expliquent les droits applicables et le délai de réponse normalement d'un mois, avec prolongation motivée dans les cas prévus.

**Action / responsable.** Exploitant et backend : publier une adresse surveillée, décrire réception, vérification proportionnée de l'identité, accès/rectification/effacement/limitation et portabilité lorsqu'elle s'applique. Préparer un export structuré des données concernées, une purge complète et le traitement des sessions actives. Ne pas confondre fermeture d'Alcide et suppression du compte Google.

**Acceptation.** Exercice complet sur deux comptes synthétiques : réponse au seul demandeur, export sans données de l'autre, effacement des notes et dépendances, session ancienne rendue inutilisable selon la politique décidée ; trace minimale du traitement de la demande et délai maîtrisé. Une procédure manuelle répétable suffit pour une première version si elle est réellement testée et dotée d'un responsable.

### PRIV-05 — P1 à lever par preuves — Régions, sous-traitance et transferts des comptes réels restent à qualifier

**Preuve.** Le code et `docs/deployment.md:5` identifient les services, mais ne prouvent pas les régions retenues, les contrats applicables, les sous-traitants ultérieurs, les accès support ou les réglages de conservation de l'organisation. Les comptes fournisseurs n'ont pas été audités dans ce mandat. Aucun transfert illicite n'est démontré.

**Règle.** Les [clauses de sous-traitance visées à l'article 28](https://www.cnil.fr/fr/clauses-contractuelles-types-entre-responsable-de-traitement-et-sous-traitant) et l'encadrement des [transferts hors UE au chapitre V du RGPD](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre5) répondent à deux sujets distincts. Le choix d'une région européenne ne suffit pas à conclure à l'absence de tout transfert.

**Action / responsable.** Titulaire des comptes et référent vie privée : constituer une fiche par prestataire réellement utilisé, son rôle, catégories de données, région/configuration, contrat, garanties de transfert si nécessaires et durées. Vérifier les engagements réellement applicables à l'organisation, puis aligner la notice. Examiner aussi accès au dépôt, aux journaux et aux sauvegardes.

**Acceptation.** Inventaire vérifié sur les comptes et contrats effectifs, décisions de transfert justifiées, accès minimisés et notice cohérente. Les preuves internes peuvent être conservées hors du dépôt public ; le rapport doit seulement en référencer l'existence et le responsable.

### PRIV-06 — P1 — Les mentions d'éditeur et d'hébergement manquent au périmètre candidat

**Preuve.** Le pied de page (`apps/web/app/layout.tsx:137`) ne contient que le lien de confidentialité. Aucune page de mentions légales n'a été trouvée dans `apps/web/app`, et la notice ne donne pas les coordonnées de l'hébergeur ou de l'éditeur.

**Règle.** L'[article 1-1 de la LCEN en vigueur](https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006089778) prévoit les informations d'édition et d'hébergement. Le régime non professionnel peut permettre de préserver l'anonymat sous conditions ; il ne supprime pas toute mention d'hébergement.

**Action / responsable.** Éditeur : qualifier son statut et publier les mentions adaptées, sans inventer de raison sociale, SIRET ou coordonnées. Rédiger des conditions d'utilisation claires sur le périmètre sportif, la génération IA et le support. La rédaction de CGU est ici une recommandation de cadrage ; les obligations de vente/CGV ne sont pas déduites d'une monétisation qui n'a pas été constatée.

**Acceptation.** Mentions accessibles sans session, identité/statut et coordonnées d'hébergement vérifiés, conditions cohérentes avec un service gratuit ou payant effectivement choisi.

### PRIV-07 — P2 — Compléter l'inventaire des cookies sans ajouter de consentement inutile

**Observation réelle.** Le 29 octobre à 13:46 UTC, les GET sur `https://ai-sport-web.vercel.app` redirigent vers `https://www.alcideai.fr`. L'accueil et `/confidentialite` répondent 200 sans `Set-Cookie` ni script externe détecté dans leur HTML. `/api/auth/csrf` répond 200 avec deux noms de cookies Auth.js : `__Host-authjs.csrf-token` et `__Secure-authjs.callback-url`, comportant les attributs HttpOnly, Secure et SameSite. Les valeurs n'ont pas été affichées ni conservées.

**Limites.** Ces trois requêtes HTTP ne constituent pas un audit navigateur des appels dynamiques, du stockage local ou du parcours Google. La recherche dans les sources applicatives inspectées n'a pas identifié d'intégration de publicité ou analytics ; cela ne prouve pas l'absence de configuration ajoutée par l'hébergeur.

**Action / responsable.** Frontend et vie privée : relever les noms, finalités, durées, domaines et déclenchements des traceurs réels avant/après connexion et sur la version candidate livrée ; documenter les cookies nécessaires. Les [règles CNIL sur les traceurs](https://cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi) prévoient une exemption pour ceux strictement nécessaires à l'authentification/sécurité. Aucun bandeau de consentement n'est exigé par les seuls cookies nécessaires constatés. Si de nouveaux traceurs non exemptés sont ajoutés, les bloquer avant consentement et gérer son retrait.

**Acceptation.** Inventaire navigateur daté sur le SHA servi, choix d'exemption justifiés ; aucune requête de traceur non exempté avant consentement si une telle intégration existe.

## Qualifications à documenter sans présumer leur résultat

- **Public visé et mineurs.** Le code inspecté ne limite pas explicitement le service aux adultes. Décider du public avant d'arrêter l'information, le régime de consentement et les garanties nécessaires ; ne pas ajouter une collecte d'âge disproportionnée sans justification.
- **AIPD.** Consigner un examen des risques, notamment données sensibles, profilage éventuel, technologie et public vulnérable. La [CNIL sur l'analyse d'impact](https://www.cnil.fr/fr/definition/analyse-dimpact-aipd) rattache l'obligation au risque élevé. Ni la seule mention « IA », ni la seule taille actuelle du projet ne suffisent à trancher.
- **Hébergement de données de santé.** Le coaching sportif ne rend pas automatiquement HDS obligatoire. Qualifier les finalités, le contexte de collecte et les acteurs si le service évolue vers prévention, diagnostic ou soins ; la [CNIL distingue les applications de bien-être des cas d'hébergement de santé réglementé](https://www.cnil.fr/fr/applications-mobiles-en-sante-et-protection-des-donnees-personnelles-les-questions-se-poser). Aucun changement de fournisseur n'est prescrit par cet audit.

## Points favorables et limites générales

La notice existe, est liée au pied de page et distingue honnêtement prototype et fonctions absentes. Les notes de suivi ne sont pas injectées dans les appels IA inspectés. Les textes libres sont bornés et l'accès aux journaux est lié à l'utilisateur ; l'audit sécurité traite la robustesse de cette identité. Le service ne fournit pas d'outil de diagnostic dans le code examiné, et la notice rappelle la limite médicale.

Cet audit ne certifie pas la conformité : il n'a pas consulté de données réelles, contrats privés, régions de comptes fournisseurs ni politique interne inconnue. Les constats documentaires ne démontrent aucune exploitation. Les sources juridiques officielles ci-dessus ont été consultées le 29 octobre 2026 ; leurs principes sont appliqués ici au code et aux informations disponibles, avec les qualifications laissées explicitement ouvertes.
