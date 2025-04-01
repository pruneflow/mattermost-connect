const winston = require('winston');

// Configuration de base avec au moins un transport
const logger = winston.createLogger({
    level: 'info', // Niveau de log minimal
    format: winston.format.combine(
        winston.format.timestamp(), // Ajoute un horodatage
        winston.format.colorize(), // Ajoute des couleurs
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
        })
    ),
    transports: [
        // Transport pour la console
        new winston.transports.Console({
            format: winston.format.simple()
        }),

        // Optionnel : transport pour les fichiers de log
        new winston.transports.File({
            filename: 'error.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: 'combined.log'
        })
    ]
});

module.exports = logger;