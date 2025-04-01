// cypress/e2e/mattermost/spaces.spec.cy.js

describe("Mattermost Spaces Management", () => {
  beforeEach(() => {
    // Se connecter et accéder au tableau de bord avant chaque test
    cy.login("test@example.com", "password123");

    // S'assurer que nous sommes sur la page du tableau de bord
    cy.url().should("include", "/dashboard");

    // Attendre que la page soit complètement chargée
    cy.contains("Vos espaces Mattermost", { timeout: 10000 }).should(
      "be.visible",
    );
  });

  it("should create a new Mattermost space", () => {
    // Générer un nom unique pour l'espace
    const spaceName = `Test Space ${Date.now()}`;

    // Intercepter la requête POST pour la création d'espace
    cy.intercept("POST", "/api/mattermost-spaces").as("createSpace");

    // Cliquer sur le bouton d'ajout
    cy.contains("button", "Nouvel espace").click();

    // Vérifier que la boîte de dialogue est ouverte
    cy.get('div[role="dialog"]').should("be.visible");

    // Remplir le formulaire à l'intérieur de la boîte de dialogue
    cy.get('div[role="dialog"]').within(() => {
      cy.get('input[name="name"]').type(spaceName);

      // Cliquer sur le bouton Créer à l'intérieur de la boîte de dialogue
      cy.contains("button", "Créer").click();
    });

    // Attendre que la requête soit complétée
    cy.wait("@createSpace", { timeout: 10000 }).then(({ response }) => {
      expect(response.statusCode).to.be.oneOf([200, 201]);
    });

    // Vérifier qu'une notification est affichée (sans vérifier le texte exact)
    cy.get(".MuiSnackbar-root", { timeout: 15000 }).should("be.visible");

    // Vérifier que le nouvel espace apparaît dans la liste
    cy.contains(spaceName, { timeout: 10000 }).should("be.visible");
  });

  it("should edit a Mattermost space", () => {
    // Attendre que la liste des espaces soit chargée
    cy.get(".MuiListItem-root", { timeout: 10000 }).should(
      "have.length.at.least",
      1,
    );

    // Sélectionner le premier espace
    cy.get(".MuiListItem-root").first().click();

    // Attendre que les détails de l'espace soient affichés
    cy.wait(1000);

    // Utiliser un sélecteur plus général pour trouver les boutons d'action
    cy.get(".MuiListItemSecondaryAction-root button")
      .first()
      .click({ force: true });

    // Vérifier que la boîte de dialogue d'édition est affichée
    cy.get('div[role="dialog"]').should("be.visible");

    // Modifier le nom
    const newName = `Edited Space ${Date.now()}`;
    cy.get('div[role="dialog"]').within(() => {
      cy.get('input[name="name"]').clear().type(newName);

      // Enregistrer les modifications
      cy.contains("button", "Enregistrer").click();
    });

    // Vérifier qu'une notification est affichée
    cy.get(".MuiSnackbar-root", { timeout: 10000 }).should("be.visible");

    // Vérifier que le nom modifié apparaît dans la liste
    cy.contains(newName, { timeout: 10000 }).should("be.visible");
  });

  it("should generate a new token for a Mattermost space", () => {
    // Attendre que la liste des espaces soit chargée
    cy.get(".MuiListItem-root", { timeout: 10000 }).should(
      "have.length.at.least",
      1,
    );

    // Sélectionner le premier espace
    cy.get(".MuiListItem-root").first().click();

    // Attendre que les détails de l'espace soient affichés
    cy.wait(1000);

    // Cliquer sur le second bouton d'action (supposé être le bouton de génération de token)
    cy.get(".MuiListItemSecondaryAction-root button")
      .eq(1)
      .click({ force: true });

    // Vérifier que la boîte de dialogue de confirmation est affichée
    cy.get('div[role="dialog"]').should("be.visible");

    // Confirmer la génération
    cy.get('div[role="dialog"]').within(() => {
      cy.contains("button", "Générer").click();
    });

    // Vérifier qu'une notification est affichée
    cy.get(".MuiSnackbar-root", { timeout: 10000 }).should("be.visible");
  });

  it("should delete a Mattermost space", () => {
    // Créer d'abord un nouvel espace à supprimer
    const spaceName = `Space to Delete ${Date.now()}`;

    // Cliquer sur le bouton d'ajout
    cy.contains("button", "Nouvel espace").click();

    // Remplir le formulaire à l'intérieur de la boîte de dialogue
    cy.get('div[role="dialog"]').within(() => {
      cy.get('input[name="name"]').type(spaceName);
      cy.contains("button", "Créer").click();
    });

    // Attendre que le nouvel espace apparaisse
    cy.contains(spaceName, { timeout: 15000 }).should("be.visible");

    // Sélectionner l'espace nouvellement créé
    cy.contains(spaceName).closest(".MuiListItem-root").click();

    // Attendre que les détails de l'espace soient affichés
    cy.wait(1000);

    // Cliquer sur le troisième bouton d'action (supposé être le bouton de suppression)
    cy.get(".MuiListItemSecondaryAction-root button")
      .eq(2)
      .click({ force: true });

    // Vérifier que la boîte de dialogue de confirmation est affichée
    cy.get('div[role="dialog"]').should("be.visible");

    // Confirmer la suppression à l'intérieur de la boîte de dialogue
    cy.get('div[role="dialog"]').within(() => {
      cy.contains("button", "Supprimer").click({ force: true });
    });

    // Vérifier qu'une notification est affichée
    cy.get(".MuiSnackbar-root", { timeout: 10000 }).should("be.visible");

    // Vérifier que l'espace n'apparaît plus dans la liste
    cy.contains(spaceName).should("not.exist");
  });

  it("should handle spaces with no data gracefully", () => {
    // Intercepter la requête API et retourner un tableau vide
    cy.intercept("GET", "/api/mattermost-spaces*", {
      statusCode: 200,
      body: { data: [] },
    }).as("getEmptySpaces");

    // Recharger la page
    cy.reload();

    // Attendre la fin de la requête
    cy.wait("@getEmptySpaces");

    // Vérifier que le message d'absence d'espaces est affiché
    cy.contains("Vous n'avez pas encore d'espace Mattermost", {
      timeout: 10000,
    }).should("be.visible");
    cy.contains("Créer votre premier espace").should("be.visible");
  });
});
