// postinstall.js

// Ce script est utilisé pour déterminer si nous sommes en cours d'installation
// dans un contexte de développement ou dans un contexte d'utilisation de la bibliothèque
// par un utilisateur final.

const fs = require("fs");
const path = require("path");

// Vérifie si le dossier courant est un module installé dans node_modules
// Cela permettra de sauter la construction pour les utilisateurs finaux
const isInstalledAsDependency = () => {
  const cwd = process.cwd();
  return cwd.includes("node_modules");
};

// Vérifie si nous sommes dans un environnement CI
const isCI = () => {
  return process.env.CI === "true" || process.env.CI === true;
};

// Script principal
if (isInstalledAsDependency() || isCI()) {
  console.log("Skipping build step in install phase as this is either:");
  console.log("- A dependency installation (not development)");
  console.log("- Running in a CI environment");
  process.exit(0);
}

// Si nous sommes ici, c'est un développement local,
// nous pouvons exécuter un build si nécessaire
console.log("Development installation detected. To build the library run:");
console.log("npm run build");
