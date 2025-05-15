/**
 * Script pour extraire les classes emoji du fichier SCSS
 * Pour générer le fichier CSS complet avec toutes les classes emoji
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lire le fichier SCSS
const scssPath = join(__dirname, '..', 'sprite_mm.scss');
const scssContent = readFileSync(scssPath, 'utf8');

// Extraire toutes les règles .emoji-XX
const emojiRegex = /\.emoji-([a-f0-9-]+)\s*{\s*background-position:\s*(-?\d+)px\s+(-?\d+)px;\s*}/g;
let emojiRules = [];

let match;
while ((match = emojiRegex.exec(scssContent)) !== null) {
  const [fullMatch, emojiCode, xPos, yPos] = match;
  emojiRules.push({ 
    emojiCode, 
    xPos, 
    yPos, 
    rule: `.emoji-${emojiCode} { background-position: ${xPos}px ${yPos}px; }`
  });
}

// Créer le contenu CSS
let cssContent = `/**
 * Styles générés automatiquement pour les emojis
 * À partir du fichier sprite_mm.scss de Mattermost
 */

.emojisprite {
    width: 66px;
    max-width: none;
    height: 66px;
    background-repeat: no-repeat;
    border-radius: 18px;
    cursor: pointer;
    -moz-transform: scale(0.35);
    zoom: 0.35;
    background-image: url('../sprite_mm.gif');
}

/* Common category classes */
.emoji-category-recent, 
.emoji-category-smileys-emotion,
.emoji-category-people-body,
.emoji-category-animals-nature,
.emoji-category-food-drink,
.emoji-category-travel-places,
.emoji-category-activities,
.emoji-category-objects,
.emoji-category-symbols,
.emoji-category-flags {
    background-image: url('../sprite_mm.gif');
}

/* Positions spécifiques pour chaque emoji */
${emojiRules.map(rule => rule.rule).join('\n')}
`;

// Écrire le fichier CSS
const cssPath = join(__dirname, 'emoji-styles.css');
writeFileSync(cssPath, cssContent);

console.log(`Fichier CSS généré avec ${emojiRules.length} règles d'emoji!`);