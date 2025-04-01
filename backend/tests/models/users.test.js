const { Model } = require('objection');
const createUserModel = require('../../src/models/users');

// Mock pour objection Model
jest.mock('objection', () => {
  return {
    Model: class MockModel {
      static get tableName() { return 'users'; }
      $beforeInsert() {}
      $beforeUpdate() {}
    }
  };
});

describe('User Model', () => {
  let User;
  let app;

  beforeEach(() => {
    // Mock de l'app
    app = {
      get: jest.fn()
    };

    // Créer le modèle User
    User = createUserModel(app);
  });

  test('devrait définir correctement le nom de la table', () => {
    expect(User.tableName).toBe('users');
  });

  test('devrait définir un schéma JSON valide', () => {
    const schema = User.jsonSchema;
    
    // Vérifier que le schéma existe
    expect(schema).toBeDefined();
    
    // Vérifier les propriétés requises
    expect(schema.required).toContain('email');
    expect(schema.required).toContain('password');
    
    // Vérifier les propriétés
    expect(schema.properties.email.type).toBe('string');
    expect(schema.properties.email.format).toBe('email');
    expect(schema.properties.password.type).toBe('string');
    expect(schema.properties.isAdmin.type).toBe('boolean');
  });

  test('devrait mettre à jour les timestamps avant l\'insertion', () => {
    // Capturer la date actuelle
    const now = new Date();
    const realDate = Date;
    global.Date = class extends Date {
      constructor() {
        super();
        return now;
      }
      static now() {
        return now.getTime();
      }
    };
    
    // Instance de test
    const user = new User();
    user.$beforeInsert();
    
    // Restaurer Date
    global.Date = realDate;
    
    // Vérifier les timestamps
    expect(user.createdAt).toBe(now.toISOString());
    expect(user.updatedAt).toBe(now.toISOString());
  });

  test('devrait mettre à jour le timestamp updatedAt avant la mise à jour', () => {
    // Capturer la date actuelle
    const now = new Date();
    const realDate = Date;
    global.Date = class extends Date {
      constructor() {
        super();
        return now;
      }
      static now() {
        return now.getTime();
      }
    };
    
    // Instance de test
    const user = new User();
    user.$beforeUpdate();
    
    // Restaurer Date
    global.Date = realDate;
    
    // Vérifier le timestamp
    expect(user.updatedAt).toBe(now.toISOString());
  });
});
