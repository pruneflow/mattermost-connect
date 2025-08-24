#!/usr/bin/env node

/**
 * Script d'installation et de build automatisé pour MattermostConnect
 *
 * Utilisation: node setup.js [demo|build|dev]
 * - demo: Construit la bibliothèque et lance l'application démo
 * - build: Construit uniquement la bibliothèque
 * - dev: Lance le mode développement (surveillance des fichiers)
 *
 * Si aucun argument n'est fourni, exécute la commande 'demo'
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// En modules ES, __dirname n'existe pas, il faut le recréer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Options de commande
const command = process.argv[2] || "demo";
const validCommands = ["demo", "build", "dev"];
const isSecure = process.argv.includes("--secure");

if (!validCommands.includes(command)) {
  console.error(`Commande invalide: ${command}`);
  console.error(`Commandes valides: ${validCommands.join(", ")}`);
  console.error(`Options: --secure (pour HTTPS)`);
  process.exit(1);
}

// Vérifier si pnpm est installé
try {
  execSync("pnpm --version", { stdio: "ignore" });
} catch (error) {
  console.error(
    "pnpm n'est pas installé. Veuillez l'installer avec \"npm install -g pnpm\"",
  );
  process.exit(1);
}

// Créer la structure du dossier examples/demo si elle n'existe pas
const demoDir = path.join(__dirname, "examples", "demo");
if (!fs.existsSync(demoDir)) {
  console.log("Création du dossier examples/demo...");
  fs.mkdirSync(demoDir, { recursive: true });
  fs.mkdirSync(path.join(demoDir, "src"), { recursive: true });
}

// Fonction pour exécuter une commande avec affichage
function run(cmd, options = {}) {
  console.log(`\n> ${cmd}\n`);
  return execSync(cmd, { stdio: "inherit", ...options });
}

// Installer les dépendances
console.log("Installation des dépendances...");
run("pnpm install");

// Exécuter la commande demandée
if (command === "build") {
  console.log("Construction de la bibliothèque...");
  run("pnpm build");
}

if (command === "demo") {
  // Installer les dépendances dans le projet de démonstration
  console.log("Installation des dépendances de la démo...");
  run("pnpm build && cd examples/demo && pnpm install");
  
  if (isSecure) {
    console.log("Lancement de l'application démo en mode HTTPS...");
    run("VITE_HTTPS=true pnpm --filter mattermost-connect-demo start --host");
  } else {
    console.log("Lancement de l'application démo...");
    run("pnpm --filter mattermost-connect-demo start --host");
  }
} else if (command === "dev") {
  console.log("Lancement du mode développement...");
  run("pnpm dev");
}

console.log(`\nCommande '${command}' exécutée avec succès!\n`);
