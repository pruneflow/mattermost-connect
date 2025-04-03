require("dotenv").config();
const logger = require("../src/logger");

// Liste des variables d'environnement requises
const requiredEnvVars = [
  "JWT_SECRET",
  "DB_USER",
  "DB_PASSWORD",
  "DB_DATABASE",
  "MATTERMOST_ADMIN_TOKEN",
];

// Liste des variables d'environnement avec des valeurs par défaut
const optionalEnvVars = [
  "PORT",
  "HOST",
  "CORS_ORIGINS",
  "JWT_AUDIENCE",
  "JWT_ISSUER",
  "JWT_EXPIRES_IN",
  "DB_CLIENT",
  "DB_HOST",
  "MATTERMOST_BASE_URL",
  "MAILER_HOST",
  "MAILER_PORT",
  "MAILER_SECURE",
  "MAILER_USER",
  "MAILER_PASS",
  "DEFAULT_EMAIL",
];

function testEnvironmentVariables() {
  logger.info("Vérification des variables d'environnement...");

  let missingVars = [];

  // Vérifier les variables requises
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Afficher les résultats
  if (missingVars.length > 0) {
    logger.error(
      `Variables d'environnement requises manquantes: ${missingVars.join(", ")}`,
    );
    logger.error(
      "Veuillez définir ces variables dans le fichier .env ou votre environnement",
    );
  } else {
    logger.info(
      "✅ Toutes les variables d'environnement requises sont définies",
    );
  }

  // Vérifier les variables optionnelles
  let undefinedOptionalVars = [];
  optionalEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      undefinedOptionalVars.push(varName);
    }
  });

  if (undefinedOptionalVars.length > 0) {
    logger.warn(
      `Variables d'environnement optionnelles non définies: ${undefinedOptionalVars.join(", ")}`,
    );
    logger.warn("Ces variables utiliseront les valeurs par défaut");
  } else {
    logger.info(
      "✅ Toutes les variables d'environnement optionnelles sont définies",
    );
  }

  // Test du format de certaines variables
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn(
      "JWT_SECRET devrait être une chaîne longue et complexe (au moins 32 caractères)",
    );
  }

  if (
    process.env.CORS_ORIGINS &&
    !process.env.CORS_ORIGINS.includes(",") &&
    !process.env.CORS_ORIGINS.includes("*")
  ) {
    logger.info(
      `CORS configuré pour une seule origine: ${process.env.CORS_ORIGINS}`,
    );
  }

  // Vérifier si nous sommes en mode production
  if (process.env.NODE_ENV === "production") {
    logger.info("Application configurée pour l'environnement de PRODUCTION");

    // Vérifications spécifiques à la production
    if (
      process.env.JWT_SECRET &&
      process.env.JWT_SECRET === process.env.JWT_SECRET.toLowerCase()
    ) {
      logger.warn(
        "En production, JWT_SECRET devrait contenir une combinaison de lettres majuscules, minuscules, chiffres et caractères spéciaux",
      );
    }

    if (!process.env.MAILER_SECURE || process.env.MAILER_SECURE === "false") {
      logger.warn(
        "En production, il est recommandé d'utiliser MAILER_SECURE=true pour les connexions SMTP",
      );
    }
  } else {
    logger.info("Application configurée pour l'environnement de DÉVELOPPEMENT");
  }

  logger.info("Vérification des variables d'environnement terminée");
}

// Exécuter le test
testEnvironmentVariables();
