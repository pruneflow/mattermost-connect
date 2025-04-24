// src/core/utils/comparison.ts
/**
 * Utilitaires pour la comparaison d'objets et de valeurs
 * Utilisés pour optimiser les re-renders en détectant les changements réels
 */

/**
 * Compare deux objets de manière superficielle
 * Retourne true si les objets sont égaux ou équivalents
 *
 * @param a Premier objet à comparer
 * @param b Second objet à comparer
 * @returns true si les objets sont égaux, false sinon
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  // Si les références sont identiques, retourne vrai immédiatement
  if (a === b) {
    return true;
  }

  // Si l'une des valeurs est null ou undefined, mais pas l'autre
  if (a == null || b == null) {
    return false;
  }

  // Si ce ne sont pas des objets, ou s'ils sont de type différent
  if (typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  // Obtenir les clés des deux objets
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  // Vérifier si le nombre de clés est différent
  if (keysA.length !== keysB.length) {
    return false;
  }

  // Vérifier chaque clé
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];

    // Si la clé n'existe pas sur le second objet
    if (!Object.prototype.hasOwnProperty.call(b, key)) {
      return false;
    }

    // Si les valeurs ne sont pas égales
    if ((a as any)[key] !== (b as any)[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Compare deux objets de manière profonde (récursive)
 * Plus lente que shallowEqual, à utiliser avec précaution
 *
 * @param a Premier objet à comparer
 * @param b Second objet à comparer
 * @param maxDepth Profondeur maximale de récursion (défaut: 10)
 * @returns true si les objets sont égaux, false sinon
 */
export function deepEqual<T>(a: T, b: T, maxDepth: number = 10): boolean {
  // Si la profondeur maximale est atteinte, utiliser la comparaison superficielle
  if (maxDepth <= 0) {
    return shallowEqual(a, b);
  }

  // Si les références sont identiques, retourne vrai immédiatement
  if (a === b) {
    return true;
  }

  // Si l'une des valeurs est null ou undefined, mais pas l'autre
  if (a == null || b == null) {
    return false;
  }

  // Si ce ne sont pas des objets, ou s'ils sont de type différent
  if (typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  // Vérifier si ce sont des tableaux
  const isArrayA = Array.isArray(a);
  const isArrayB = Array.isArray(b);

  // Si l'un est un tableau mais pas l'autre
  if (isArrayA !== isArrayB) {
    return false;
  }

  // Si ce sont des tableaux
  if (isArrayA && isArrayB) {
    // Vérifier la longueur des tableaux
    if ((a as any).length !== (b as any).length) {
      return false;
    }

    // Vérifier chaque élément du tableau de manière récursive
    for (let i = 0; i < (a as any).length; i++) {
      if (!deepEqual((a as any)[i], (b as any)[i], maxDepth - 1)) {
        return false;
      }
    }

    return true;
  }

  // Obtenir les clés des deux objets
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  // Vérifier si le nombre de clés est différent
  if (keysA.length !== keysB.length) {
    return false;
  }

  // Vérifier chaque clé de manière récursive
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];

    // Si la clé n'existe pas sur le second objet
    if (!Object.prototype.hasOwnProperty.call(b, key)) {
      return false;
    }

    // Vérifier les valeurs de manière récursive
    if (!deepEqual((a as any)[key], (b as any)[key], maxDepth - 1)) {
      return false;
    }
  }

  return true;
}

/**
 * Compare deux objets par leurs propriétés spécifiées
 * Utile pour les comparaisons personnalisées
 *
 * @param a Premier objet
 * @param b Second objet
 * @param props Liste des propriétés à comparer
 * @returns true si toutes les propriétés spécifiées sont égales
 */
export function compareProps<T>(a: T, b: T, props: Array<keyof T>): boolean {
  // Si les références sont identiques, retourne vrai immédiatement
  if (a === b) {
    return true;
  }

  // Si l'une des valeurs est null ou undefined, mais pas l'autre
  if (a == null || b == null) {
    return false;
  }

  // Comparer uniquement les propriétés spécifiées
  for (const prop of props) {
    if (a[prop] !== b[prop]) {
      return false;
    }
  }

  return true;
}

/**
 * Compare deux tableaux de manière superficielle
 * Vérifie si les références des éléments sont identiques
 *
 * @param a Premier tableau
 * @param b Second tableau
 * @returns true si les tableaux contiennent les mêmes références d'éléments
 */
export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  // Si les références sont identiques, retourne vrai immédiatement
  if (a === b) {
    return true;
  }

  // Si l'un des tableaux est null ou undefined, mais pas l'autre
  if (a == null || b == null) {
    return false;
  }

  // Vérifier si la longueur est différente
  if (a.length !== b.length) {
    return false;
  }

  // Vérifier chaque élément
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Compare les identifiants des objets dans deux tableaux
 * Utile pour comparer des tableaux d'objets identifiables
 *
 * @param a Premier tableau d'objets
 * @param b Second tableau d'objets
 * @param idField Nom de la propriété ID (défaut: 'id')
 * @returns true si les tableaux contiennent les mêmes IDs
 */
export function compareArrayByIds<T extends object>(
  a: T[],
  b: T[],
  idField: keyof T = "id" as keyof T,
): boolean {
  // Si les références sont identiques, retourne vrai immédiatement
  if (a === b) {
    return true;
  }

  // Si l'un des tableaux est null ou undefined, mais pas l'autre
  if (a == null || b == null) {
    return false;
  }

  // Vérifier si la longueur est différente
  if (a.length !== b.length) {
    return false;
  }

  // Extraire les IDs du premier tableau
  const idsA = a.map((item) => item[idField]);

  // Vérifier si tous les IDs du second tableau sont présents dans le premier
  return b.every((item) => idsA.includes(item[idField]));
}
