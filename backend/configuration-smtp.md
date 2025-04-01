# Configuration SMTP pour l'envoi d'emails

Pour permettre à l'application d'envoyer des emails d'invitation (et potentiellement d'autres types d'emails), vous devez configurer un serveur SMTP.

## Options de configuration

Vous pouvez configurer le serveur SMTP de deux manières:

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre_email@example.com
SMTP_PASS=votre_mot_de_passe
SMTP_FROM=noreply@mattermost-admin.com
```

### 2. Configuration JSON

Vous pouvez également configurer le serveur SMTP dans le fichier `config/default.json` ou `config/production.json` :

```json
{
  "smtp": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "votre_email@example.com",
      "pass": "votre_mot_de_passe"
    },
    "tls": {
      "rejectUnauthorized": false
    },
    "from": "noreply@mattermost-admin.com",
    "companyName": "Votre Entreprise",
    "address": "123 Rue Example, 75000 Paris, France"
  }
}
```

## Configurer avec Gmail

Si vous souhaitez utiliser Gmail comme serveur SMTP, voici la configuration à utiliser:

```json
{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "votre_email@gmail.com",
      "pass": "votre_mot_de_passe_d_application"
    }
  }
}
```

**Note importante**: Pour Gmail, vous devez utiliser un "mot de passe d'application" et non votre mot de passe normal. Vous pouvez créer un mot de passe d'application dans les paramètres de sécurité de votre compte Google.

## Configurer avec un service SMTP gratuit

Voici quelques services SMTP gratuits que vous pouvez utiliser:

### SendGrid (100 emails gratuits par jour)

```json
{
  "smtp": {
    "host": "smtp.sendgrid.net",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "apikey",
      "pass": "VOTRE_CLE_API_SENDGRID"
    }
  }
}
```

### Mailgun (Offre gratuite limitée)

```json
{
  "smtp": {
    "host": "smtp.mailgun.org",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "postmaster@votre-domaine.mailgun.org",
      "pass": "votre-mot-de-passe-mailgun"
    }
  }
}
```

## Test de la configuration SMTP

Vous pouvez tester votre configuration SMTP en utilisant le point d'API suivant:

```
POST /api/mailer/test
```

Avec le corps de la requête:

```json
{
  "to": "destinataire@example.com"
}
```

Si tout est correctement configuré, un email de test sera envoyé à l'adresse spécifiée.