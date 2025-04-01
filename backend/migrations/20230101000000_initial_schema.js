/**
 * Migration initiale pour créer les tables nécessaires
 */
exports.up = function(knex) {
    return knex.schema.createTable('users', table => {
        table.increments('id').primary();
        table.string('email').unique().notNullable();
        table.string('password').notNullable();
        table.string('firstName').nullable();
        table.string('lastName').nullable();
        table.string('companyName').nullable();
        table.boolean('isAdmin').defaultTo(false);
        table.jsonb('mattermost').nullable(); // Pour stocker les informations liées au serveur Mattermost
        table.timestamp('createdAt').defaultTo(knex.fn.now());
        table.timestamp('updatedAt').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('users');
};