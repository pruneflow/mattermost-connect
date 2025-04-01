// tests/e2e/auth/login.spec.js
describe('Login Page', () => {
  beforeEach(() => {
    // Visiter la page de connexion avant chaque test
    cy.visit('/login');
  });

  it('should display the login form', () => {
    // Vérifier que les éléments du formulaire sont présents
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('Connexion').should('exist');
  });

  it('should show validation errors for empty fields', () => {
    // Cliquer sur le bouton de connexion sans remplir les champs
    cy.get('button[type="submit"]').click();

    // Vérifier que les messages d'erreur de validation apparaissent
    cy.contains("L'email est requis").should('be.visible');
    cy.contains("Le mot de passe est requis").should('be.visible');
  });

  it('should show error message for invalid credentials', () => {
    // Remplir le formulaire avec des identifiants incorrects
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    // Vérifier que le message d'erreur apparaît
    cy.contains('Invalid login').should('be.visible');
  });

  it('should redirect to dashboard after successful login', () => {
    // Utiliser la commande personnalisée login (définie dans commands.js)
    cy.login('test@example.com', 'password123');

    // Vérifier la redirection
    cy.url().should('include', '/dashboard');
    cy.contains('Tableau de bord').should('be.visible');
  });

  it('should navigate to registration page', () => {
    // Cliquer sur le lien d'inscription
    cy.contains('Inscrivez-vous').click();

    // Vérifier la redirection
    cy.url().should('include', '/register');
  });
});