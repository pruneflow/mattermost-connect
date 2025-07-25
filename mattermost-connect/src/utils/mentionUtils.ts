import { UserProfile } from '../api/types';

/**
 * Utilitaires pour la gestion des mentions dans les messages
 */

/**
 * Types de mentions
 */
export const MENTION_TYPES = {
  USER: 'user',
  CHANNEL: 'channel',
  ALL: 'all',
  HERE: 'here',
} as const;

export type MentionType = typeof MENTION_TYPES[keyof typeof MENTION_TYPES];

/**
 * Interface pour une mention
 */
export interface Mention {
  type: MentionType;
  value: string;
  display: string;
  position: {
    start: number;
    end: number;
  };
}

/**
 * Expressions régulières pour les mentions
 */
const MENTION_PATTERNS = {
  USER: /@([a-zA-Z0-9._-]+)/g,
  CHANNEL: /@(channel|all|here)/g,
  ALL_MENTIONS: /@([a-zA-Z0-9._-]+|channel|all|here)/g,
};

/**
 * Extrait toutes les mentions d'un message
 */
export const extractMentions = (message: string): Mention[] => {
  const mentions: Mention[] = [];
  let match;
  
  // Reset regex
  MENTION_PATTERNS.ALL_MENTIONS.lastIndex = 0;
  
  while ((match = MENTION_PATTERNS.ALL_MENTIONS.exec(message)) !== null) {
    const mentionText = match[1];
    const type = getMentionType(mentionText);
    
    mentions.push({
      type,
      value: mentionText,
      display: `@${mentionText}`,
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    });
  }
  
  return mentions;
};

/**
 * Détermine le type d'une mention
 */
export const getMentionType = (mention: string): MentionType => {
  switch (mention.toLowerCase()) {
    case 'channel':
      return MENTION_TYPES.CHANNEL;
    case 'all':
      return MENTION_TYPES.ALL;
    case 'here':
      return MENTION_TYPES.HERE;
    default:
      return MENTION_TYPES.USER;
  }
};

/**
 * Vérifie si une mention est une mention spéciale
 */
export const isSpecialMention = (mention: string): boolean => {
  return ['channel', 'all', 'here'].includes(mention.toLowerCase());
};

/**
 * Surligne les mentions dans un message HTML
 */
export const highlightMentions = (
  html: string,
  currentUserId: string,
  users: Record<string, UserProfile>,
  channelMemberIds: string[] = []
): string => {
  const mentions = extractMentions(html);
  let highlightedHtml = html;
  
  // Traiter les mentions en ordre inverse pour préserver les positions
  const sortedMentions = mentions.sort((a, b) => b.position.start - a.position.start);
  
  for (const mention of sortedMentions) {
    const replacement = createMentionElement(mention, currentUserId, users, channelMemberIds);
    highlightedHtml = 
      highlightedHtml.substring(0, mention.position.start) +
      replacement +
      highlightedHtml.substring(mention.position.end);
  }
  
  return highlightedHtml;
};

/**
 * Crée un élément HTML pour une mention
 */
const createMentionElement = (
  mention: Mention,
  currentUserId: string,
  users: Record<string, UserProfile>,
  channelMemberIds: string[]
): string => {
  const isCurrentUser = mention.type === MENTION_TYPES.USER && mention.value === users[currentUserId]?.username;
  const isValidUser = mention.type === MENTION_TYPES.USER && users[mention.value];
  const isChannelMember = mention.type === MENTION_TYPES.USER && channelMemberIds.includes(mention.value);
  
  let className = 'mention';
  let title = mention.display;
  
  // Classe CSS selon le type et l'état
  if (isCurrentUser) {
    className += ' mention--current-user';
    title = 'You';
  } else if (mention.type === MENTION_TYPES.USER) {
    if (isValidUser && isChannelMember) {
      className += ' mention--valid-user';
      const user = users[mention.value];
      title = user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user.username;
    } else {
      className += ' mention--invalid-user';
      title = 'Unknown user';
    }
  } else {
    className += ' mention--special';
    switch (mention.type) {
      case MENTION_TYPES.CHANNEL:
        title = 'Notifies everyone in the channel';
        break;
      case MENTION_TYPES.ALL:
        title = 'Notifies everyone in the team';
        break;
      case MENTION_TYPES.HERE:
        title = 'Notifies everyone online in the channel';
        break;
    }
  }
  
  return `<span class="${className}" title="${title}" data-mention="${mention.value}">${mention.display}</span>`;
};

/**
 * Vérifie si un message contient des mentions
 */
export const hasMentions = (message: string): boolean => {
  return MENTION_PATTERNS.ALL_MENTIONS.test(message);
};

/**
 * Vérifie si un message mentionne un utilisateur spécifique
 */
export const mentionsUser = (message: string, username: string): boolean => {
  const mentions = extractMentions(message);
  return mentions.some(mention => 
    mention.type === MENTION_TYPES.USER && mention.value === username
  );
};

/**
 * Vérifie si un message contient des mentions spéciales
 */
export const hasSpecialMentions = (message: string): boolean => {
  const mentions = extractMentions(message);
  return mentions.some(mention => isSpecialMention(mention.value));
};

/**
 * Filtre les mentions valides selon les utilisateurs du canal
 */
export const filterValidMentions = (
  mentions: Mention[],
  users: Record<string, UserProfile>,
  channelMemberIds: string[]
): Mention[] => {
  return mentions.filter(mention => {
    if (mention.type !== MENTION_TYPES.USER) {
      return true; // Les mentions spéciales sont toujours valides
    }
    
    const user = users[mention.value];
    return user && channelMemberIds.includes(user.id);
  });
};

/**
 * Obtient la liste des utilisateurs mentionnés
 */
export const getMentionedUsers = (
  message: string,
  users: Record<string, UserProfile>
): UserProfile[] => {
  const mentions = extractMentions(message);
  const mentionedUsers: UserProfile[] = [];
  
  for (const mention of mentions) {
    if (mention.type === MENTION_TYPES.USER) {
      const user = Object.values(users).find(u => u.username === mention.value);
      if (user) {
        mentionedUsers.push(user);
      }
    }
  }
  
  return mentionedUsers;
};

/**
 * Remplace les mentions par des noms d'affichage
 */
export const replaceMentionsWithDisplayNames = (
  message: string,
  users: Record<string, UserProfile>
): string => {
  return message.replace(MENTION_PATTERNS.USER, (match, username) => {
    const user = Object.values(users).find(u => u.username === username);
    if (user && (user.first_name || user.last_name)) {
      const displayName = user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name;
      return `@${displayName}`;
    }
    return match;
  });
};

/**
 * Suggère des mentions basées sur la saisie
 */
export const suggestMentions = (
  input: string,
  users: UserProfile[],
  channelMemberIds: string[]
): Array<{type: MentionType; value: string; display: string; user?: UserProfile}> => {
  const suggestions: Array<{type: MentionType; value: string; display: string; user?: UserProfile}> = [];
  
  if (!input.startsWith('@')) {
    return suggestions;
  }
  
  const searchTerm = input.slice(1).toLowerCase();
  
  // Mentions spéciales
  const specialMentions = ['channel', 'all', 'here'];
  for (const special of specialMentions) {
    if (special.includes(searchTerm)) {
      suggestions.push({
        type: getMentionType(special),
        value: special,
        display: `@${special}`,
      });
    }
  }
  
  // Utilisateurs du canal
  const channelUsers = users.filter(user => channelMemberIds.includes(user.id));
  
  for (const user of channelUsers) {
    const username = user.username.toLowerCase();
    const firstName = user.first_name?.toLowerCase() || '';
    const lastName = user.last_name?.toLowerCase() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (
      username.includes(searchTerm) ||
      firstName.includes(searchTerm) ||
      lastName.includes(searchTerm) ||
      fullName.includes(searchTerm)
    ) {
      suggestions.push({
        type: MENTION_TYPES.USER,
        value: user.username,
        display: `@${user.username}`,
        user,
      });
    }
  }
  
  // Trier par pertinence
  return suggestions.sort((a, b) => {
    if (a.type !== MENTION_TYPES.USER && b.type === MENTION_TYPES.USER) return -1;
    if (a.type === MENTION_TYPES.USER && b.type !== MENTION_TYPES.USER) return 1;
    
    if (a.type === MENTION_TYPES.USER && b.type === MENTION_TYPES.USER) {
      const aStartsWith = a.value.toLowerCase().startsWith(searchTerm);
      const bStartsWith = b.value.toLowerCase().startsWith(searchTerm);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
    }
    
    return a.value.localeCompare(b.value);
  });
};