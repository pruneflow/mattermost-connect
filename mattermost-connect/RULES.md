Règles de gouvernance des instances d'IA

Pour les applications web / librairie, il faut absolument suivre ces bonnes pratiques (sauf si le contraire est demandé explicaitement): BonnesPratiques.md


Ces RÈGLES doivent être suivies en tout temps.

Ce document définit les principes de fonctionnement obligatoires pour toutes les instances d'IA. Il assure un comportement cohérent, une exécution robuste et une collaboration sécurisée entre les tâches et les services.

JOURNAL.md doit toujours être mis à jour pour suivre de façon chirurgicale les dev en cours.

⸻

Protocoles de nettoyage de code (OBLIGATOIRE)

    Avant de supprimer TOUT fichier, effectuer une analyse minutieuse de dépendances :
    1. Identifier TOUS les fichiers utilisés dans la démo (trace complète depuis entry point)
    2. Pour chaque fichier utilisé, vérifier TOUS ses imports
    3. Créer un graphe complet des dépendances réelles
    4. En cas de MOINDRE doute sur l'usage d'un fichier, le renommer avec suffix "_old" au lieu de le supprimer
    5. Après renommage, vérifier que build et typecheck fonctionnent parfaitement
    6. Documenter chaque fichier supprimé/renommé dans JOURNAL.md avec justification précise

    Pour toute adaptation Mattermost, rechercher et documenter l'implémentation officielle exacte :
    1. Identifier le composant/hook Mattermost équivalent via recherche GitHub
    2. Analyser le code source officiel (API calls, WebSocket events, état, props)
    3. Documenter dans JOURNAL.md l'implémentation exacte trouvée avec liens GitHub
    4. Adapter notre code pour reproduire EXACTEMENT le même comportement
    5. Tester que le comportement est identique à Mattermost officiel
⸻

Normes de qualité du code

    Tous les scripts doivent implémenter une gestion structurée des erreurs avec des modes de défaillance spécifiques.

    Chaque fonction doit inclure une jsdoc concise et axée sur l'objectif en anglais.

    Les opérations de longue durée doivent implémenter des mécanismes de délai d'attente et d'annulation. 

⸻

Protocoles de documentation (en anglais)

    La documentation doit être synchronisée avec les modifications du code - pas de références obsolètes.

    Les fichiers Markdown doivent utiliser des hiérarchies de titres et des formats de sections cohérents.

    Les extraits de code dans la documentation doivent être exécutables, testés et refléter des cas d'utilisation réels.

    Chaque document doit clairement indiquer : l'objectif, l'utilisation, les paramètres et les exemples.

    Les termes techniques doivent être expliqués en ligne ou liés à une définition canonique.

⸻

Consignes de conformité en matière de sécurité

    Les identifiants codés en dur sont strictement interdits - utiliser des mécanismes de stockage sécurisés.

    Toutes les entrées doivent être validées, assainies et vérifiées par type avant le traitement.

    Éviter d'utiliser eval, des appels shell non assainis ou toute forme de vecteurs d'injection de commandes.

⸻

Principes opérationnels de base

    Ne jamais utiliser de données factices, de secours ou synthétiques dans les tâches de production.

    La logique de gestion des erreurs doit être conçue en utilisant les principes du test en premier.

    Toujours agir sur la base de preuves vérifiables, et non d'hypothèses.

    Toutes les préconditions doivent être explicitement validées avant toute opération destructive ou à fort impact.

⸻

Principes de la philosophie de conception

DRY (Dont repeat yourself) - Aucune duplication, extraire les composants si ils peuvent être utilisé à plusieurs endroits

KISS (Keep It Simple, Stupid) (Fais simple, idiot)
• Les solutions doivent être simples et faciles à comprendre.
• Éviter la sur-ingénierie ou l'abstraction inutile.
• Privilégier la lisibilité et la maintenabilité du code.

YAGNI (You Aren’t Gonna Need It) (Tu n'en auras pas besoin)
• Ne pas ajouter de fonctionnalités spéculatives ou de pérennisation, sauf si cela est explicitement requis.
• Se concentrer uniquement sur les exigences et les livrables immédiats.
• Minimiser le gonflement du code et la dette technique à long terme.

Principes SOLID

    Principe de responsabilité unique - chaque module ou fonction ne doit faire qu'une seule chose.

    Principe ouvert-fermé - les entités logicielles doivent être ouvertes à l'extension mais fermées à la modification.

    Principe de substitution de Liskov - les classes dérivées doivent être substituables à leurs types de base.

    Principe de ségrégation des interfaces - préférer de nombreuses interfaces spécifiques à une interface polyvalente.

    Principe d'inversion de dépendance - dépendre des abstractions, et non des implémentations concrètes.

⸻

Consignes d'extension du système


    Les nouvelles fonctionnalités doivent maintenir la compatibilité descendante, sauf si cela est justifié et documenté.

    Toutes les modifications doivent inclure une évaluation de l'impact sur les performances.

⸻

Procédures d'assurance qualité


    La documentation doit être relue pour la clarté, la cohérence et l'exactitude technique.

    Les sorties destinées aux utilisateurs (journaux, messages, erreurs) doivent être claires, non techniques et exploitables.

    Tous les messages d'erreur doivent suggérer des voies de correction ou des étapes de diagnostic.

    Toutes les mises à jour majeures doivent inclure un plan de restauration ou un mécanisme de retour en arrière sûr.

⸻

Règles de test et de simulation

    Toute nouvelle logique doit être testée en interne: Test de non régression, test de performance, vérifier que tout les principes sont respectés

