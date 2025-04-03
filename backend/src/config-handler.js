// Gestionnaire de configuration pour remplacer les variables d'environnement
const logger = require("./logger");

/**
 * Remplace les valeurs de configuration par des variables d'environnement si disponibles
 * @param {Object} config - L'objet de configuration
 * @returns {Object} - L'objet de configuration avec les valeurs remplacées
 */
function processConfig(config) {
  // Fonction récursive pour parcourir et remplacer les valeurs
  function processValue(value) {
    if (typeof value === "string" && process.env[value]) {
      return process.env[value];
    } else if (Array.isArray(value)) {
      // Si c'est un tableau, traiter chaque élément
      return value.map(processValue);
    } else if (
      typeof value === "string" &&
      value === "CORS_ORIGINS" &&
      process.env[value]
    ) {
      // Cas spécial pour CORS_ORIGINS qui doit être un tableau
      return process.env[value].split(",");
    } else if (value !== null && typeof value === "object") {
      // Si c'est un objet, traiter récursivement
      return processObject(value);
    }
    return value;
  }

  function processObject(obj) {
    const result = {};
    for (const key in obj) {
      result[key] = processValue(obj[key]);
    }
    return result;
  }

  // Traiter l'objet de configuration
  const processedConfig = processObject(config);

  // Ne pas logger les informations sensibles en production
  if (process.env.NODE_ENV !== "production") {
    logger.debug("Configuration processed with environment variables");
  }

  return processedConfig;
}

module.exports = { processConfig };
