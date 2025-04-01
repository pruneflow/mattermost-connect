// tests/e2e/team-members/members.spec.cy.js
describe("Team Members Management", () => {
  beforeEach(() => {
    // Se connecter et accéder au tableau de bord avant chaque test
    cy.login("test@example.com", "password123");

    // S'assurer que nous sommes sur la page du tableau de bord
    cy.url().should("include", "/dashboard");

    // Attendre que la page soit complètement chargée
    cy.contains("Vos espaces Mattermost", { timeout: 10000 }).should(
      "be.visible",
    );

    // Sélectionner le premier espace dans la liste
    cy.get(".MuiListItem-root").first().click();

    // Aller à l'onglet Membres
    cy.contains("Membres").click();
    cy.contains("Gestion des membres", { timeout: 5000 }).should("be.visible");
  });

  it("should display the members list for a selected space", () => {
    // Intercepter la requête API pour récupérer les membres
    cy.intercept("GET", "/api/team-members*").as("getMembers");

    // Vérifier que la requête a été envoyée
    cy.wait("@getMembers");

    // Vérifier que le titre est affiché
    cy.contains("Gestion des membres").should("be.visible");

    // Vérifier la présence du formulaire d'invitation
    cy.contains("Inviter un nouveau membre").should("be.visible");

    // Vérifier la présence de la liste des membres
    cy.contains("Membres actuels").should("be.visible");

    // Vérifier les en-têtes du tableau
    cy.contains("Nom d'utilisateur").should("be.visible");
    cy.contains("Email").should("be.visible");
    cy.contains("Rôle").should("be.visible");
  });

  it("should invite a new member", () => {
    // Intercepter la requête API pour l'invitation
    cy.intercept("POST", "/api/team-members").as("inviteMember");

    // Générer un email unique
    const uniqueEmail = `test-${Date.now()}@example.com`;

    // Remplir le formulaire d'invitation
    cy.get(
      'input[placeholder="Adresse email"], input[label="Adresse email"]',
    ).type(uniqueEmail);

    // Cliquer sur le bouton d'invitation
    cy.contains("Inviter").click();

    // Vérifier que la requête a été envoyée
    cy.wait("@inviteMember").then((interception) => {
      expect(interception.request.body).to.include({
        email: uniqueEmail,
      });
    });

    // Vérifier la notification de succès
    cy.contains("Invitation envoyée avec succès", { timeout: 5000 }).should(
      "be.visible",
    );

    // Vérifier que l'email apparaît dans la liste
    cy.contains(uniqueEmail).should("be.visible");
  });

  it("should update a member's role", () => {
    // Intercepter la requête API pour la mise à jour du rôle
    cy.intercept("PATCH", "/api/team-members/*").as("updateRole");

    // Trouver le premier switch de rôle qui n'est pas désactivé
    cy.get('.MuiSwitch-root:not([disabled="disabled"])').first().click();

    // Vérifier que la requête a été envoyée
    cy.wait("@updateRole").then((interception) => {
      expect(interception.request.body).to.have.property("isAdmin");
    });

    // Vérifier la notification de succès
    cy.contains("Rôle mis à jour avec succès", { timeout: 5000 }).should(
      "be.visible",
    );
  });

  it("should remove a member", () => {
    // Assurons-nous d'avoir au moins un membre à supprimer (créons-en un)
    cy.intercept("POST", "/api/team-members").as("inviteMember");

    // Générer un email unique
    const uniqueEmail = `remove-${Date.now()}@example.com`;

    // Inviter un membre à supprimer
    cy.get(
      'input[placeholder="Adresse email"], input[label="Adresse email"]',
    ).type(uniqueEmail);
    cy.contains("Inviter").click();
    cy.wait("@inviteMember");

    // Intercepter la requête API pour la suppression
    cy.intercept("DELETE", "/api/team-members/*").as("removeMember");

    // Trouver le bouton de suppression pour le membre nouvellement créé
    cy.contains(uniqueEmail)
      .parents("tr")
      .find('[data-testid="remove-member-button"]')
      .click();

    // Confirmer la suppression dans la boîte de dialogue
    cy.contains("Confirmer la suppression").should("be.visible");
    cy.contains("Supprimer").click();

    // Vérifier que la requête a été envoyée
    cy.wait("@removeMember");

    // Vérifier la notification de succès
    cy.contains("Membre supprimé avec succès", { timeout: 5000 }).should(
      "be.visible",
    );

    // Vérifier que le membre n'apparaît plus dans la liste
    cy.contains(uniqueEmail).should("not.exist");
  });

  it("should handle invitation errors gracefully", () => {
    // Intercepter la requête API pour l'invitation et simuler une erreur
    cy.intercept("POST", "/api/team-members", {
      statusCode: 400,
      body: {
        message: "Erreur lors de l'invitation: adresse email invalide",
      },
    }).as("inviteMemberError");

    // Remplir le formulaire avec une valeur incorrecte
    cy.get(
      'input[placeholder="Adresse email"], input[label="Adresse email"]',
    ).type("invalid-email");

    // Cliquer sur le bouton d'invitation
    cy.contains("Inviter").click();

    // Vérifier que la requête a été envoyée
    cy.wait("@inviteMemberError");

    // Vérifier l'affichage du message d'erreur
    cy.contains("Erreur lors de l'envoi de l'invitation", {
      timeout: 5000,
    }).should("be.visible");
  });
});
