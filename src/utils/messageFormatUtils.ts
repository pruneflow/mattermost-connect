import DOMPurify from 'dompurify';
import { findEmojiByName } from './emojiMartAdapter';

/**
 * Utilities for Mattermost message formatting and rendering
 */

/**
 * DOMPurify configuration for security
 */
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'del', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'data-*',
    'target', 'rel', 'rowspan', 'colspan'
  ],
  ALLOW_DATA_ATTR: true,
};

/**
 * Regular expressions for Markdown formatting
 */
const MARKDOWN_PATTERNS = {
  BOLD: /\*\*(.*?)\*\*/g,
  ITALIC: /\*(.*?)\*/g,
  STRIKETHROUGH: /~~(.*?)~~/g,
  CODE_INLINE: /`([^`]+)`/g,
  CODE_BLOCK: /```(\w+)?\n([\s\S]*?)```/g,
  
  LINK: /\[([^\]]+)\]\(([^)]+)\)/g,
  AUTO_LINK: /(https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g,
  
  UNORDERED_LIST: /^[-*+] (.+)$/gm,
  ORDERED_LIST: /^(\d+)\. (.+)$/gm,
  
  HEADING: /^(#{1,6}) (.+)$/gm,
  
  BLOCKQUOTE: /^> (.+)$/gm,
  
  TABLE_ROW: /^\|(.+)\|$/gm,
  TABLE_SEPARATOR: /^\|[-: ]+\|$/gm,
};

/**
 * Convertit le markdown en HTML
 */
export const parseMarkdown = (text: string): string => {
  if (!text) return '';
  
  let html = text;
  
  html = html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');
  
  html = html.replace(MARKDOWN_PATTERNS.CODE_BLOCK, (match, language, code) => {
    const lang = language || 'text';
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });
  
  html = html.replace(MARKDOWN_PATTERNS.CODE_INLINE, '<code>$1</code>');
  
  // Formatage texte
  html = html.replace(MARKDOWN_PATTERNS.BOLD, '<strong>$1</strong>');
  html = html.replace(MARKDOWN_PATTERNS.ITALIC, '<em>$1</em>');
  html = html.replace(MARKDOWN_PATTERNS.STRIKETHROUGH, '<del>$1</del>');
  
  // Process markdown links first - add https:// if missing
  html = html.replace(MARKDOWN_PATTERNS.LINK, (match, text, url) => {
    // Add https:// if URL doesn't start with http:// or https://
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  
  // Then auto-link URLs that are NOT already inside <a> tags
  html = html.replace(MARKDOWN_PATTERNS.AUTO_LINK, (match, url) => {
    // Check if this URL is already inside an <a> tag by looking backwards and forwards
    const beforeMatch = html.substring(0, html.indexOf(match));
    const afterMatch = html.substring(html.indexOf(match) + match.length);
    
    // If we find an unclosed <a> tag before this match, skip it
    const lastOpenTag = beforeMatch.lastIndexOf('<a ');
    const lastCloseTag = beforeMatch.lastIndexOf('</a>');
    
    if (lastOpenTag > lastCloseTag) {
      return match; // Already inside a link, don't modify
    }
    
    // Add https:// if URL doesn't start with http:// or https://
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
  
  html = html.replace(MARKDOWN_PATTERNS.HEADING, (match, hashes, title) => {
    const level = hashes.length;
    return `<h${level}>${title}</h${level}>`;
  });
  
  html = html.replace(MARKDOWN_PATTERNS.BLOCKQUOTE, '<blockquote>$1</blockquote>');
  
  html = html.replace(MARKDOWN_PATTERNS.UNORDERED_LIST, '<li>$1</li>');
  html = html.replace(MARKDOWN_PATTERNS.ORDERED_LIST, '<li>$2</li>');
  
  // Envelopper les listes
  html = html.replace(/(<li>.*<\/li>)/gm, (match) => {
    if (match.includes('1.')) {
      return `<ol>${match}</ol>`;
    }
    return `<ul>${match}</ul>`;
  });
  
  // Sauts de ligne
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

/**
 * Cleans and secures HTML
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
};

/**
 * Converts markdown to secure HTML
 */
export const formatMessage = (message: string): string => {
  if (!message) return '';
  
  const html = parseMarkdown(message);
  return sanitizeHtml(html);
};

/**
 * Extrait les mentions d'un message
 */
export const extractMentions = (message: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(message)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

/**
 * Extracts special mentions (@channel, @all, @here)
 */
export const extractSpecialMentions = (message: string): string[] => {
  const specialMentionRegex = /@(channel|all|here)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = specialMentionRegex.exec(message)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

/**
 * Extrait les hashtags d'un message
 */
export const extractHashtags = (message: string): string[] => {
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  const hashtags: string[] = [];
  let match;
  
  while ((match = hashtagRegex.exec(message)) !== null) {
    hashtags.push(match[1]);
  }
  
  return hashtags;
};

/**
 * Extracts custom emojis from a message
 */
export const extractCustomEmojis = (message: string): string[] => {
  const emojiRegex = /:([a-zA-Z0-9_+-]+):/g;
  const emojis: string[] = [];
  let match;
  
  while ((match = emojiRegex.exec(message)) !== null) {
    emojis.push(match[1]);
  }
  
  return emojis;
};

/**
 * Replaces custom emojis with images
 */
export const replaceCustomEmojis = (message: string, emojiMap: Record<string, string>): string => {
  return message.replace(/:([a-zA-Z0-9_+-]+):/g, (match, emojiName) => {
    const emojiUrl = emojiMap[emojiName];
    if (emojiUrl) {
      return `<img src="${emojiUrl}" alt="${emojiName}" class="emoji" title=":${emojiName}:" />`;
    }
    return match;
  });
};

/**
 * Compte les mots dans un message
 */
export const countWords = (message: string): number => {
  if (!message) return 0;
  return message.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Counts characters in a message
 */
export const countCharacters = (message: string): number => {
  return message ? message.length : 0;
};

/**
 * Checks if a message contains only emojis
 */
export const isEmojiOnly = (message: string): boolean => {
  const cleanMessage = message.replace(/:[a-zA-Z0-9_+-]+:/g, '').trim();
  return cleanMessage.length === 0;
};

/**
 * Extrait le texte brut d'un message HTML
 */
export const extractPlainText = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

/**
 * Previews a message (first words)
 */
export const previewMessage = (message: string, maxLength: number = 100): string => {
  const plainText = extractPlainText(message);
  if (plainText.length <= maxLength) return plainText;
  
  return plainText.substring(0, maxLength - 3) + '...';
};

/**
 * Formate un message pour la recherche (retire le formatage)
 */
export const formatForSearch = (message: string): string => {
  return message
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Gras
    .replace(/\*(.*?)\*/g, '$1')      // Italique
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')        .replace(/```[\s\S]*?```/g, '')   // Blocs de code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')    .toLowerCase()
    .trim();
};