/**
 * Utilitaires pour la gestion des blocs de code et syntax highlighting
 */

/**
 * Langages supportés pour le syntax highlighting
 */
export const SUPPORTED_LANGUAGES = {
  // Langages principaux
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'python': 'Python',
  'py': 'Python',
  'java': 'Java',
  'cpp': 'C++',
  'c': 'C',
  'csharp': 'C#',
  'cs': 'C#',
  'php': 'PHP',
  'ruby': 'Ruby',
  'rb': 'Ruby',
  'go': 'Go',
  'rust': 'Rust',
  'rs': 'Rust',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'kt': 'Kotlin',
  'scala': 'Scala',
  
  // Langages web
  'html': 'HTML',
  'css': 'CSS',
  'scss': 'SCSS',
  'sass': 'Sass',
  'less': 'Less',
  'vue': 'Vue',
  'react': 'React',
  'jsx': 'JSX',
  'tsx': 'TSX',
  
  // Langages de données
  'json': 'JSON',
  'xml': 'XML',
  'yaml': 'YAML',
  'yml': 'YAML',
  'toml': 'TOML',
  'csv': 'CSV',
  
  // Langages de script
  'bash': 'Bash',
  'sh': 'Shell',
  'powershell': 'PowerShell',
  'ps1': 'PowerShell',
  'batch': 'Batch',
  'bat': 'Batch',
  
  // Langages de base de données
  'sql': 'SQL',
  'mysql': 'MySQL',
  'postgresql': 'PostgreSQL',
  'plsql': 'PL/SQL',
  
  // Langages markup
  'markdown': 'Markdown',
  'md': 'Markdown',
  'latex': 'LaTeX',
  'tex': 'LaTeX',
  
  // Autres
  'diff': 'Diff',
  'dockerfile': 'Dockerfile',
  'makefile': 'Makefile',
  'gitignore': 'Gitignore',
  'plaintext': 'Plain Text',
  'text': 'Plain Text',
} as const;

/**
 * Détecte le langage d'un bloc de code
 */
export const detectLanguage = (code: string, hint?: string): string => {
  // Utiliser l'indice fourni s'il est valide
  if (hint && SUPPORTED_LANGUAGES[hint.toLowerCase() as keyof typeof SUPPORTED_LANGUAGES]) {
    return hint.toLowerCase();
  }
  
  // Détection basique par mots-clés
  const codeLines = code.split('\n').slice(0, 10); // Première 10 lignes
  const codeText = codeLines.join(' ').toLowerCase();
  
  // JavaScript/TypeScript
  if (codeText.includes('function') || codeText.includes('const') || codeText.includes('let') || codeText.includes('var')) {
    if (codeText.includes('interface') || codeText.includes('type ') || codeText.includes(': string') || codeText.includes(': number')) {
      return 'typescript';
    }
    return 'javascript';
  }
  
  // Python
  if (codeText.includes('def ') || codeText.includes('import ') || codeText.includes('from ') || codeText.includes('print(')) {
    return 'python';
  }
  
  // Java
  if (codeText.includes('public class') || codeText.includes('public static void') || codeText.includes('import java.')) {
    return 'java';
  }
  
  // C/C++
  if (codeText.includes('#include') || codeText.includes('int main(') || codeText.includes('printf(')) {
    return codeText.includes('cout') || codeText.includes('std::') ? 'cpp' : 'c';
  }
  
  // HTML
  if (codeText.includes('<!doctype') || codeText.includes('<html') || codeText.includes('<div') || codeText.includes('<p>')) {
    return 'html';
  }
  
  // CSS
  if (codeText.includes('{') && codeText.includes('}') && (codeText.includes('color:') || codeText.includes('margin:') || codeText.includes('padding:'))) {
    return 'css';
  }
  
  // JSON
  if ((codeText.startsWith('{') && codeText.includes('"')) || (codeText.startsWith('[') && codeText.includes('"'))) {
    return 'json';
  }
  
  // SQL
  if (codeText.includes('select ') || codeText.includes('from ') || codeText.includes('where ') || codeText.includes('insert into')) {
    return 'sql';
  }
  
  // Bash/Shell
  if (codeText.includes('#!/bin/bash') || codeText.includes('echo ') || codeText.includes('grep ') || codeText.includes('awk ')) {
    return 'bash';
  }
  
  // Dockerfile
  if (codeText.includes('from ') || codeText.includes('run ') || codeText.includes('copy ') || codeText.includes('expose ')) {
    return 'dockerfile';
  }
  
  return 'plaintext';
};

/**
 * Formate un bloc de code pour l'affichage
 */
export const formatCodeBlock = (code: string, language?: string): {
  code: string;
  language: string;
  displayName: string;
} => {
  const detectedLanguage = detectLanguage(code, language);
  const displayName = SUPPORTED_LANGUAGES[detectedLanguage as keyof typeof SUPPORTED_LANGUAGES] || 'Plain Text';
  
  return {
    code: code.trim(),
    language: detectedLanguage,
    displayName,
  };
};

/**
 * Extrait les blocs de code d'un message
 */
export const extractCodeBlocks = (message: string): Array<{
  content: string;
  language: string;
  displayName: string;
  startIndex: number;
  endIndex: number;
}> => {
  const codeBlocks: Array<{
    content: string;
    language: string;
    displayName: string;
    startIndex: number;
    endIndex: number;
  }> = [];
  
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(message)) !== null) {
    const language = match[1] || '';
    const content = match[2];
    const formatted = formatCodeBlock(content, language);
    
    codeBlocks.push({
      content: formatted.code,
      language: formatted.language,
      displayName: formatted.displayName,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  return codeBlocks;
};

/**
 * Extrait le code inline d'un message
 */
export const extractInlineCode = (message: string): Array<{
  content: string;
  startIndex: number;
  endIndex: number;
}> => {
  const inlineCode: Array<{
    content: string;
    startIndex: number;
    endIndex: number;
  }> = [];
  
  const inlineCodeRegex = /`([^`]+)`/g;
  let match;
  
  while ((match = inlineCodeRegex.exec(message)) !== null) {
    inlineCode.push({
      content: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  return inlineCode;
};

/**
 * Vérifie si un message contient du code
 */
export const hasCode = (message: string): boolean => {
  return /```[\s\S]*?```/.test(message) || /`[^`]+`/.test(message);
};

/**
 * Vérifie si un message contient des blocs de code
 */
export const hasCodeBlocks = (message: string): boolean => {
  return /```[\s\S]*?```/.test(message);
};

/**
 * Vérifie si un message contient du code inline
 */
export const hasInlineCode = (message: string): boolean => {
  return /`[^`]+`/.test(message);
};

/**
 * Compte le nombre de lignes dans un bloc de code
 */
export const countCodeLines = (code: string): number => {
  return code.split('\n').length;
};

/**
 * Ajoute les numéros de ligne à un bloc de code
 */
export const addLineNumbers = (code: string): string => {
  const lines = code.split('\n');
  const maxDigits = lines.length.toString().length;
  
  return lines.map((line, index) => {
    const lineNumber = (index + 1).toString().padStart(maxDigits, ' ');
    return `${lineNumber} | ${line}`;
  }).join('\n');
};

/**
 * Formate un bloc de code pour le presse-papiers
 */
export const formatCodeForClipboard = (code: string, language: string): string => {
  return `\`\`\`${language}\n${code}\n\`\`\``;
};

/**
 * Vérifie si un langage supporte la coloration syntaxique
 */
export const supportsHighlighting = (language: string): boolean => {
  return language in SUPPORTED_LANGUAGES && language !== 'plaintext' && language !== 'text';
};

/**
 * Obtient la liste des langages suggérés pour l'autocomplétion
 */
export const getSuggestedLanguages = (input: string): string[] => {
  const normalizedInput = input.toLowerCase();
  
  return Object.keys(SUPPORTED_LANGUAGES)
    .filter(lang => lang.includes(normalizedInput))
    .sort((a, b) => {
      // Priorité aux correspondances exactes
      if (a === normalizedInput) return -1;
      if (b === normalizedInput) return 1;
      
      // Priorité aux correspondances qui commencent par l'input
      const aStarts = a.startsWith(normalizedInput);
      const bStarts = b.startsWith(normalizedInput);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.localeCompare(b);
    })
    .slice(0, 10); // Limiter à 10 suggestions
};

/**
 * Échappe les caractères spéciaux dans le code
 */
export const escapeCodeForHtml = (code: string): string => {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Déséchappe les caractères spéciaux dans le code
 */
export const unescapeCodeFromHtml = (code: string): string => {
  return code
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};