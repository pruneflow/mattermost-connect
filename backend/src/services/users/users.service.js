const { Users } = require('./users.class');
const createModel = require('../../models/users');
const hooks = require('./users.hooks');

module.exports = function (app) {
    const options = {
        Model: createModel(app),
        paginate: app.get('paginate')
    };

    // Initialiser le service
    app.use('/api/users', new Users(options, app));

    // Enregistrer les hooks
    const service = app.service('api/users');
    service.hooks(hooks);
};