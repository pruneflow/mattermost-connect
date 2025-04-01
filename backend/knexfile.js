const app = require('./src/app');
const config = app.get('postgres');

module.exports = {
    development: {
        ...config,
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: './seeds'
        }
    },
    staging: {
        ...config,
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations'
        }
    },
    production: {
        ...config,
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations'
        }
    }
};