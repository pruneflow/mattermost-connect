// ***********************************************
// Commandes personnalisées pour Cypress
// ***********************************************

// Commande pour se connecter directement
Cypress.Commands.add("login", (email, password) => {
  cy.request({
    method: "POST",
    url: "http://localhost:3030/api/authentication",
    body: {
      strategy: "local",
      email,
      password,
    },
  }).then((response) => {
    // Stocker le token dans localStorage
    localStorage.setItem("auth-token", response.body.accessToken);

    // Visiter le tableau de bord
    cy.visit("/dashboard");
  });
});

// Commande pour s'inscrire directement
Cypress.Commands.add("register", (userData) => {
  cy.request({
    method: "POST",
    url: "http://localhost:3030/api/users",
    body: userData,
  }).then((response) => {
    // Après l'inscription, se connecter avec les mêmes identifiants
    cy.login(userData.email, userData.password);
  });
});

// Commande pour se déconnecter
Cypress.Commands.add("logout", () => {
  // Supprimer le token du localStorage
  localStorage.removeItem("auth-token");

  // Revenir à la page de connexion
  cy.visit("/login");
});

// Commande pour vérifier qu'un utilisateur est connecté
Cypress.Commands.add("isLoggedIn", () => {
  cy.window()
    .its("localStorage")
    .invoke("getItem", "auth-token")
    .should("exist");
});

// Commande pour vérifier qu'un utilisateur n'est pas connecté
Cypress.Commands.add("isLoggedOut", () => {
  cy.window()
    .its("localStorage")
    .invoke("getItem", "auth-token")
    .should("not.exist");
});

Cypress.Commands.add("setLanguage", (lang) => {
  localStorage.setItem("i18nextLng", lang);
});
