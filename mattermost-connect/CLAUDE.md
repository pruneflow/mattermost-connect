# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Gouvernance et Règles Techniques

**OBLIGATOIRE** : Suivre systématiquement les principes définis dans :
- `RULES.md` - Règles de gouvernance générales
- `BonnesPratiques.md` - Standards techniques pour applications web

## Mode d'Interaction : Sparring Partner Technique

**Objectif** : Être un partenaire intellectuel qui aide à trouver les MEILLEURES solutions tout en respectant les bonnes pratiques.

**Méthode** : Pour chaque proposition/idée :
1. **Analyser les assumptions** - Qu'est-ce qui est pris pour acquis ?
2. **Évaluer la conformité** - La solution respecte-t-elle les règles RULES.md et BonnesPratiques.md ?
3. **Proposer des alternatives** - Comment mieux implémenter dans le cadre des contraintes ?
4. **Questionner l'approche** - Y a-t-il des failles ou des optimisations possibles ?
5. **Prioriser la qualité** - Corriger clairement si l'approche viole les bonnes pratiques

**Principe directeur** : Le questionnement critique au SERVICE des bonnes pratiques, pas contre elles.

## Règle de Refactoring Intelligent

**OBLIGATOIRE** : Si un refactor (même minime) est nécessaire, ne pas hésiter. Ne pas ajouter de la complexité sous prétexte qu'on doit "corriger".

**Méthode** :
1. **Analyser le problème en profondeur** - Pourquoi ça ne marche pas vraiment ?
2. **Rechercher Mattermost officiel** - Comment c'est fait côté source officiel ?
3. **Réfléchir avant de corriger** - Quelle est la VRAIE solution architecturale ?
4. **Refactorer proprement** - Quitte à refaire des fichiers entiers si nécessaire
5. **Éviter les patchs** - Une solution simple et élégante vaut mieux qu'un hack complexe

**Principe** : Mieux vaut refaire correctement que maintenir du code bancal.

---

## Project Overview

MattermostConnect est une librairie de composants React moderne pour intégrer les fonctionnalités Mattermost dans n'importe quelle application web. L'objectif est de **reproduire exactement** l'expérience Mattermost native tout en respectant nos contraintes architecturales.

### Objectifs de Qualité

**Performance Parfaite** :
- Temps réel fluide via WebSocket optimisé
- Éviter les appels API redondants
- Lazy loading intelligent
- Gestion d'état efficace sans sur-ingénierie

**Fidélité à Mattermost** :
- **TOUJOURS** vérifier sur le web comment Mattermost implémente une fonctionnalité
- Reproduire le comportement exact (UX, interactions, temps réel)
- Maintenir la compatibilité avec l'API Mattermost officielle

**Contraintes Architecturales** :
- Rester SIMPLE : pas de Redux, pas de grosses dépendances
- Composants autonomes et réutilisables
- WebSocket géré de façon centralisée et optimisée
- Gestion d'état légère (Context + useState/useReducer)

### Modes d'Intégration

- **Direct Mode** : Connexion directe avec serveur Mattermost (token utilisateur)
- **Proxy Mode** : Connexion via service intermédiaire

---

## Architecture Technique

### Structure du Code

- **src/components/** : Composants UI réutilisables (auth, channels, messages, teams)
- **src/hooks/** : Hooks React pour chaque fonctionnalité
- **src/api/** : Client API et utilitaires
- **src/context/** : Contextes React pour état global
- **src/utils/** : Fonctions utilitaires

### Gestion Temps Réel

**WebSocket Strategy** :
- Connexion unique centralisée
- Event dispatch optimisé
- Reconnexion automatique intelligente
- Throttling pour événements haute fréquence

### Gestion d'État

**Principe** : État local quand possible, global quand nécessaire
- React Query pour cache serveur
- Context API pour état global simple
- useState/useReducer pour logique locale
- **ÉVITER** Redux et autres solutions lourdes

---

## Commandes de Développement

```bash
# Installation
pnpm install

# Build de la librairie
pnpm run build

# Mode développement avec watch
pnpm run dev

# Nettoyage
pnpm run clean

# Qualité du code
pnpm run lint
pnpm run format
pnpm run typecheck
pnpm run test

# Application de démo
pnpm run demo
```

### Demo Application

```bash
# Build principal + démo
pnpm run build
cd examples/demo
pnpm install
pnpm start

# Développement (2 terminaux)
# Terminal 1 (root) : pnpm run dev
# Terminal 2 (demo) : pnpm start
```

---

## Workflow de Développement

### Recherche et Implémentation

1. **Analyser Mattermost officiel** - Comment la fonctionnalité est-elle implémentée ?
2. **Identifier les patterns** - APIs utilisées, événements WebSocket, comportements UX
3. **Adapter à notre architecture** - Respecter nos contraintes de simplicité
4. **Optimiser performance** - Minimiser les appels, optimiser le temps réel selon le pattern intelligent :
   - **Unread counts** : Un seul API initial → WebSocket sync uniquement  
   - **Messages contextuels** : Fetch initial avec `/api/v4/users/{user_id}/channels/{channel_id}/posts/unread?limit_before=30&limit_after=30` → pagination classique → WebSocket conditionnel
   - **Stratégie lazy** : Fetch channel uniquement quand l'utilisateur y accède
5. **Tester dans la démo** - Vérifier que l'expérience est identique

### Validation Qualité

- Exécuter `pnpm run typecheck` et `pnpm run lint` avant commit
- Tester les changements dans l'application de démo
- Vérifier les performances (pas de calls excessifs)
- S'assurer de la compatibilité avec l'API Mattermost

---

## **Endpoints API Mattermost Utilisés**

### **Posts et Pagination**
```http
# Initial fetch contextuel (autour du dernier non-lu)
GET /api/v4/users/{user_id}/channels/{channel_id}/posts/unread?limit_before=30&limit_after=30

# Pagination classique ensuite  
GET /api/v4/channels/{channel_id}/posts?before={post_id}  # Messages plus anciens
GET /api/v4/channels/{channel_id}/posts?after={post_id}   # Messages plus récents
```

### **Unread Counts**
```http
# Compteurs globaux (refresh unique au démarrage)
GET /api/v4/users/{user_id}/teams/unread

# Informations channel spécifique
GET /api/v4/users/{user_id}/channels/{channel_id}/unread
```

### **WebSocket Events**
- `posted` → Increment unread count + add message (si channel fetched)
- `channel_viewed` → Reset unread count à 0  
- `post_deleted` → Remove from cache
- `post_updated` → Update in cache

**Principe fondamental** : Chaque fonctionnalité doit fonctionner exactement comme dans Mattermost, mais avec notre code simple et performant.

---

## **📋 SUIVI OPÉRATIONNEL**

### **Journal de Bord Obligatoire**

**🚨 PROTOCOLE IMPÉRATIF :**
1. **Première action de chaque session** : Consulter `JOURNAL.md` pour connaître l'état exact des tâches
2. **Mise à jour temps réel** : Le journal DOIT être maintenu avec une précision exemplaire à chaque étape
3. **Recherche officielle obligatoire** : Avant tout développement, vérifier sources et documentation Mattermost officielles
4. **Traçabilité complète** : Chaque modification, recherche, et décision documentée dans le journal

**Voir → `JOURNAL.md`** pour :
- État précis de toutes les tâches en cours
- Problèmes identifiés avec localisation exacte des fichiers/lignes
- Solutions techniques validées avec sources Mattermost officielles
- Protocoles de développement et de nettoyage
- Historique détaillé des sessions de travail

**Exigence de précision** : Le journal doit contenir un niveau de détail permettant à n'importe quel développeur de reprendre le travail exactement où il a été interrompu, sans perte d'information ni re-analyse nécessaire.