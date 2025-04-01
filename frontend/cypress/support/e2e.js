// Import des commandes personnalisées
import "./commands";

// Désactiver les erreurs de log inutiles en production
Cypress.on("uncaught:exception", (err, runnable) => {
  // Éviter que Cypress échoue sur les erreurs non liées aux tests
  return false;
});

// Configuration globale avant les tests
beforeEach(() => {
  // Réinitialiser le localStorage avant chaque test
  cy.clearLocalStorage();
  cy.setLanguage("fr");
  cy.visit("/login");
});
