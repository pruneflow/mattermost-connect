#!/usr/bin/env node

/**
 * Script pour générer un fichier .env de production avec des valeurs aléatoires
 * pour les secrets.
 *
 * Usage: node scripts/generate-prod-env.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

// Chemin vers le fichier .env de sortie
const outputPath = path.join(__dirname, "..", ".env.production");

// Générer un secret aléatoire
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString("hex");
}

// Créer une interface pour les questions/réponses dans le terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Demander une valeur, avec une valeur par défaut proposée
function askQuestion(question, defaultValue) {
  return new Promise((resolve) => {
    rl.question(`${question} [${defaultValue}]: `, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

async function generateEnvFile() {
  console.log("Génération du fichier .env.production...");

  // Variables pour le serveur
  const host = await askQuestion("Hôte du serveur", "api.votredomaine.com");
  const port = await askQuestion("Port du serveur", "3030");
  const corsOrigins = await askQuestion(
    "Origines CORS (séparées par des virgules)",
    "https://votredomaine.com",
  );

  // Variables de base de données
  const dbHost = await askQuestion("Hôte de la base de données", "localhost");
  const dbUser = await askQuestion(
    "Utilisateur de la base de données",
    "postgres",
  );
  const dbPassword = await askQuestion(
    "Mot de passe de la base de données",
    generateSecret(16),
  );
  const dbName = await askQuestion(
    "Nom de la base de données",
    "mattermost_admin",
  );

  // Variables Mattermost
  const mattermostBaseUrl = await askQuestion(
    "URL de base Mattermost",
    "http://localhost:8065",
  );
  const mattermostAdminToken = await askQuestion(
    "Token admin Mattermost",
    "votre_token_mattermost",
  );

  // Variables JWT
  const jwtSecret = generateSecret(64);
  const jwtAudience = await askQuestion(
    "JWT audience",
    "https://votredomaine.com",
  );
  const jwtIssuer = await askQuestion("JWT issuer", "feathers");
  const jwtExpiresIn = await askQuestion("JWT expires in", "1d");

  // Variables du mailer
  const mailerHost = await askQuestion("Hôte SMTP", "smtp.votredomaine.com");
  const mailerPort = await askQuestion("Port SMTP", "587");
  const mailerSecure = await askQuestion("SMTP sécurisé (true/false)", "false");
  const mailerUser = await askQuestion(
    "Utilisateur SMTP",
    "no-reply@votredomaine.com",
  );
  const mailerPass = await askQuestion("Mot de passe SMTP", generateSecret(12));
  const defaultEmail = await askQuestion(
    "Email par défaut",
    "no-reply@votredomaine.com",
  );

  // Générer le contenu du fichier .env
  const envContent = `# Fichier .env de production
# Généré automatiquement le ${new Date().toISOString()}
# Ne pas versionner ce fichier dans Git!

# Serveur
PORT=${port}
HOST=${host}

# Cors
CORS_ORIGINS=${corsOrigins}

# Authentication
JWT_SECRET=${jwtSecret}
JWT_AUDIENCE=${jwtAudience}
JWT_ISSUER=${jwtIssuer}
JWT_EXPIRES_IN=${jwtExpiresIn}

# Base de données
DB_CLIENT=pg
DB_HOST=${dbHost}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}
DB_DATABASE=${dbName}

# Mattermost
MATTERMOST_BASE_URL=${mattermostBaseUrl}
MATTERMOST_ADMIN_TOKEN=${mattermostAdminToken}

# Mailer
MAILER_HOST=${mailerHost}
MAILER_PORT=${mailerPort}
MAILER_SECURE=${mailerSecure}
MAILER_USER=${mailerUser}
MAILER_PASS=${mailerPass}
DEFAULT_EMAIL=${defaultEmail}

# Environnement Node.js
NODE_ENV=production
`;

  // Écrire le fichier .env.production
  fs.writeFileSync(outputPath, envContent);
  console.log(`Fichier .env.production généré avec succès à ${outputPath}`);

  // Rappel de sécurité
  console.log("\nATTENTION: Ce fichier contient des informations sensibles.");
  console.log(
    "Ne le versionnez PAS dans Git et ne le partagez pas de manière non sécurisée.",
  );
  console.log(
    "Pour déployer, utilisez des variables d'environnement ou un gestionnaire de secrets sécurisé.\n",
  );

  rl.close();
}

// Exécuter la fonction
generateEnvFile().catch((err) => {
  console.error(
    "Erreur lors de la génération du fichier .env.production:",
    err,
  );
  process.exit(1);
});
