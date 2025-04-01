/**
 * Migration pour créer la table des espaces Mattermost
 */
exports.up = function(knex) {
    return knex.schema.createTable('mattermost_spaces', table => {
        table.increments('id').primary();
        table.integer('userId').unsigned().references('id').inTable('users').notNullable();
        table.string('name').notNullable();
        table.string('apiToken').nullable();
        table.string('webhookUrl').nullable();
        table.jsonb('config').nullable(); // Configuration personnalisée de l'espace
        table.boolean('isActive').defaultTo(true);
        table.timestamp('createdAt').defaultTo(knex.fn.now());
        table.timestamp('updatedAt').defaultTo(knex.fn.now());

        // Index pour accélérer les recherches
        table.index('userId');

        // Nous gardons la possibilité d'évoluer vers un modèle multi-espaces
        // en n'imposant pas d'unicité sur userId
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('mattermost_spaces');
};