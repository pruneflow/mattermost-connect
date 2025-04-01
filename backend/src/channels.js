module.exports = function(app) {
    if(typeof app.channel !== 'function') {
        // Si pas de canaux configurés, ne rien faire
        return;
    }

    app.on('connection', connection => {
        // Sur une nouvelle connexion, ajouter à un canal anonyme
        app.channel('anonymous').join(connection);
    });

    app.on('login', (authResult, { connection }) => {
        // La connexion existe déjà dans le canal anonyme
        if(connection) {
            // Retirer l'utilisateur du canal anonyme
            app.channel('anonymous').leave(connection);

            // Ajouter au canal 'authenticated'
            app.channel('authenticated').join(connection);
        }
    });

    // Publier tous les événements aux utilisateurs authentifiés
    app.publish((data, hook) => {
        return app.channel('authenticated');
    });
};