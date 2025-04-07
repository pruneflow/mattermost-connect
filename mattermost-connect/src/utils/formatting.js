// src/utils/formatting.js

/**
 * Fonctions utilitaires pour le formatage des messages Mattermost
 */

// Regex pour identifier les modèles Markdown courants
const BOLD_REGEX = /\*\*(.*?)\*\*/g;
const ITALIC_REGEX = /\*(.*?)\*/g;
const STRIKE_REGEX = /~~(.*?)~~/g;
const CODE_REGEX = /`(.*?)`/g;
const CODE_BLOCK_REGEX = /```(.*?)```/gs;
const LINK_REGEX = /\[(.*?)\]\((.*?)\)/g;
const MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g;
const CHANNEL_MENTION_REGEX = /~([a-zA-Z0-9._-]+)/g;

/**
 * Convertit un texte Markdown en HTML
 * @param {string} text - Texte à formater
 * @returns {string} Texte formaté en HTML
 */
export const formatMessageText = (text) => {
  if (!text) return "";

  let formattedText = text;

  // Échapper les caractères HTML
  formattedText = escapeHtml(formattedText);

  // Traiter les blocs de code (prioritaire pour éviter le formatage à l'intérieur)
  formattedText = formattedText.replace(CODE_BLOCK_REGEX, (match, content) => {
    return `<pre><code>${content}</code></pre>`;
  });

  // Traiter le code inline
  formattedText = formattedText.replace(CODE_REGEX, (match, content) => {
    return `<code>${content}</code>`;
  });

  // Formatage courant
  formattedText = formattedText
    .replace(BOLD_REGEX, "<strong>$1</strong>")
    .replace(ITALIC_REGEX, "<em>$1</em>")
    .replace(STRIKE_REGEX, "<del>$1</del>");

  // Liens
  formattedText = formattedText.replace(
    LINK_REGEX,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // URLs simples
  formattedText = formatUrls(formattedText);

  // Mentions (@user, ~channel)
  formattedText = formattedText
    .replace(MENTION_REGEX, '<span class="mattermost-mention">@$1</span>')
    .replace(
      CHANNEL_MENTION_REGEX,
      '<span class="mattermost-channel-mention">~$1</span>',
    );

  // Sauts de ligne
  formattedText = formattedText.replace(/\n/g, "<br />");

  return formattedText;
};

/**
 * Échapper les caractères HTML spéciaux
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
const escapeHtml = (text) => {
  const htmlEntities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (match) => htmlEntities[match]);
};

/**
 * Détecte et convertit les URLs en liens cliquables
 * @param {string} text - Texte contenant des URLs
 * @returns {string} Texte avec URLs converties en liens
 */
const formatUrls = (text) => {
  // Regex pour détecter les URLs
  const URL_REGEX = /(?<!["'])((https?|ftp):\/\/[^\s<]+[^<.,:;"')\]\s])/g;

  return text.replace(URL_REGEX, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
};

/**
 * Formate un horodatage en chaîne lisible
 * @param {number} timestamp - Timestamp Unix en millisecondes
 * @param {Object} options - Options de formatage
 * @returns {string} Date formatée
 */
export const formatTimestamp = (timestamp, options = {}) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  // Format de temps court pour aujourd'hui, date complète sinon
  if (isToday) {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } else {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
};

/**
 * Tronque un texte long avec ellipsis
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Texte tronqué
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export default {
  formatMessageText,
  formatTimestamp,
  truncateText,
};
