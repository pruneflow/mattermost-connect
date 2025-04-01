// tests/e2e/auth/register.spec.js
describe('Registration Flow', () => {
  beforeEach(() => {
    // Visiter la page d'inscription avant chaque test
    cy.visit('/register');
  });

  it('should display the registration form', () => {
    // Vérifier que tous les champs du formulaire sont présents
    cy.get('input[name="firstName"]').should('be.visible');
    cy.get('input[name="lastName"]').should('be.visible');
    cy.get('input[name="companyName"]').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('input[name="confirmPassword"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    // Cliquer sur le bouton d'inscription sans remplir les champs
    cy.get('button[type="submit"]').click();

    // Vérifier les messages d'erreur
    cy.contains('Le prénom est requis').should('be.visible');
    cy.contains('Le nom est requis').should('be.visible');
    cy.contains("Le nom de l'entreprise est requis").should('be.visible');
    cy.contains("L'email est requis").should('be.visible');
    cy.contains('Le mot de passe est requis').should('be.visible');
  });

  it('should validate password requirements', () => {
    // Remplir tous les champs sauf le mot de passe
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('User');
    cy.get('input[name="companyName"]').type('Test Company');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('short'); // Mot de passe trop court
    cy.get('input[name="confirmPassword"]').type('short');

    cy.get('button[type="submit"]').click();

    // Vérifier le message d'erreur sur la longueur du mot de passe
    cy.contains('Le mot de passe doit contenir au moins 8 caractères').should('be.visible');
  });

  it('should validate password confirmation', () => {
    // Remplir tous les champs avec des mots de passe différents
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('User');
    cy.get('input[name="companyName"]').type('Test Company');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('different123');

    cy.get('button[type="submit"]').click();

    // Vérifier le message d'erreur sur la confirmation du mot de passe
    cy.contains('Les mots de passe doivent correspondre').should('be.visible');
  });

  it('should register a new user successfully and redirect to dashboard', () => {
    // Générer un email unique pour éviter les doublons
    const uniqueEmail = `test-${Date.now()}@example.com`;

    // Remplir le formulaire avec des données valides
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('User');
    cy.get('input[name="companyName"]').type('Test Company');
    cy.get('input[name="email"]').type(uniqueEmail);
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('password123');

    cy.get('button[type="submit"]').click();

    // Vérifier la redirection vers le tableau de bord
    cy.url().should('include', '/dashboard');
    cy.contains('Bienvenue Test User').should('be.visible');
  });

  it('should navigate to login page', () => {
    // Cliquer sur le lien de connexion
    cy.contains('Connectez-vous').click();

    // Vérifier la redirection
    cy.url().should('include', '/login');
  });
});