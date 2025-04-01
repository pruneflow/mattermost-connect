# Mattermost Admin API

Interface d'administration pour Mattermost qui permet de gérer les espaces clients sur un serveur Mattermost centralisé.

## Fonctionnalités

- Authentification et gestion des utilisateurs
- Gestion des espaces clients Mattermost
- Création automatique d'espaces Mattermost pour les nouveaux utilisateurs
- Génération et gestion des tokens d'accès

## Prérequis

- Node.js (>= 18.0.0)
- PostgreSQL
- pnpm (>= 8.0.0)

## Installation

1. Cloner le répertoire
```bash
git clone [url_du_repo]
cd mattermost-admin-api
```

2. Installer les dépendances
```bash
pnpm install
```

3. Configurer la base de données
   - Créer une base de données PostgreSQL nommée `mattermost_admin`
   - Configurer les paramètres de connexion dans `config/default.json`

4. Exécuter les migrations
```bash
pnpm run migrate
```

5. Lancer l'application en mode développement
```bash
pnpm run dev
```

## Utilisation

### Authentification

Pour s'authentifier et obtenir un JWT:

```bash
curl -X POST http://localhost:3030/api/authentication -H "Content-Type: application/json" -d '{"strategy":"local","email":"user@example.com","password":"password"}'
```

### Création d'un utilisateur

```bash
curl -X POST http://localhost:3030/api/users -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"password","companyName":"Example Inc."}'
```

### Gestion des espaces Mattermost

#### Lister les espaces Mattermost de l'utilisateur connecté

```bash
curl -X GET http://localhost:3030/api/mattermost-spaces -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

#### Créer un nouvel espace Mattermost

```bash
curl -X POST http://localhost:3030/api/mattermost-spaces -H "Content-Type: application/json" -H "Authorization: Bearer VOTRE_TOKEN_JWT" -d '{"name":"Mon nouvel espace"}'
```

#### Générer un nouveau token d'API pour un espace

```bash
curl -X POST http://localhost:3030/api/tokens -H "Content-Type: application/json" -H "Authorization: Bearer VOTRE_TOKEN_JWT" -d '{"spaceId":1}'
```

## Développement

### Tests

```bash
pnpm test
```

### Linting

```bash
pnpm run lint
```

### Migrations

Créer une nouvelle migration:
```bash
pnpm run migrate:make [nom_de_la_migration]
```

Exécuter les migrations:
```bash
pnpm run migrate
```

Annuler la dernière migration:
```bash
pnpm run migrate:rollback
```

## Licence

MIT