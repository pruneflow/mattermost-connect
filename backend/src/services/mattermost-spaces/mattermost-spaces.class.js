const { Service } = require("feathers-objection");

exports.MattermostSpaces = class MattermostSpaces extends Service {
  constructor(options) {
    const { Model, ...otherOptions } = options;

    super({
      ...otherOptions,
      model: Model,
    });
  }

  // Surcharge de la méthode find pour filtrer selon l'utilisateur connecté
  async find(params) {
    const { user } = params;

    // Si un utilisateur est connecté et n'est pas admin, limitez la recherche à ses espaces
    if (user && !user.isAdmin) {
      params.query = {
        ...params.query,
        userId: user.id,
      };
    }

    return super.find(params);
  }

  // Surcharge de get pour vérifier que l'espace appartient à l'utilisateur
  async get(id, params) {
    const { user } = params;

    // Si un utilisateur est connecté et n'est pas admin, vérifiez l'accès
    if (user && !user.isAdmin) {
      // Trouvez d'abord l'espace
      const space = await super.get(id, { ...params, query: {} });

      // Vérifiez que l'utilisateur a accès à cet espace
      if (space.userId !== user.id) {
        throw new Error("Non autorisé");
      }

      return space;
    }

    return super.get(id, params);
  }

  // Pré-remplir l'ID utilisateur lors de la création
  async create(data, params) {
    const { user } = params;

    // Attribuer automatiquement l'espace à l'utilisateur connecté
    if (user) {
      data.userId = user.id;
    }

    console.debug("data", data);

    return super.create(data, params);
  }
};
