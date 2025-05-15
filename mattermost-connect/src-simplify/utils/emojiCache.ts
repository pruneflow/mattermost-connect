/**
 * Système de cache pour les emojis
 * Optimise le chargement et la mémoire en utilisant un sprite sheet
 */

// Clé pour le stockage du cache dans sessionStorage
const EMOJI_SPRITE_LOADED_KEY = 'emoji_sprite_loaded';
const EMOJI_SPRITE_LOAD_TIMESTAMP = 'emoji_sprite_load_timestamp';

// État du chargement des sprites
let isSpriteLoaded = false;

// Timestamp du dernier chargement
let lastLoadTimestamp = 0;

// Event emitter pour notifier les composants du chargement des sprites
const spriteLoadedListeners: (() => void)[] = [];

/**
 * Vérifie si le sprite sheet des emojis est chargé
 * @returns Vrai si le sprite sheet est chargé
 */
export function isSpriteSheetLoaded(): boolean {
  if (isSpriteLoaded) return true;
  
  // Vérifier aussi le sessionStorage pour la persistance entre les rendus
  try {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return false;
    }
    
    const storedValue = sessionStorage.getItem(EMOJI_SPRITE_LOADED_KEY);
    if (storedValue === 'true') {
      // Vérifier si le chargement n'est pas trop ancien (1 jour max)
      const timestamp = sessionStorage.getItem(EMOJI_SPRITE_LOAD_TIMESTAMP);
      if (timestamp) {
        const loadTime = parseInt(timestamp, 10);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        // Si le chargement est récent, considérer qu'il est toujours valide
        if (now - loadTime < oneDayMs) {
          isSpriteLoaded = true;
          return true;
        }
        
        // Sinon, reset le cache
        sessionStorage.removeItem(EMOJI_SPRITE_LOADED_KEY);
        sessionStorage.removeItem(EMOJI_SPRITE_LOAD_TIMESTAMP);
        return false;
      }
      
      isSpriteLoaded = true;
      return true;
    }
  } catch (e) {
    // Ignorer les erreurs de sessionStorage
    console.warn('Erreur lors de la vérification du cache des emojis:', e);
  }
  
  return false;
}

/**
 * Charge le sprite sheet des emojis
 * @param url URL du sprite sheet
 * @returns Une promesse qui se résout lorsque le sprite est chargé
 */
export function loadSpriteSheet(url: string): Promise<void> {
  // En environnement non-browser, retourner immédiatement
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  
  // Si déjà chargé, retourner immédiatement
  if (isSpriteLoaded) {
    return Promise.resolve();
  }
  
  // Éviter les chargements multiples rapprochés
  const now = Date.now();
  if (now - lastLoadTimestamp < 1000) {
    // Retourner une promesse qui se résout lorsque le chargement actuel est terminé
    return new Promise(resolve => {
      spriteLoadedListeners.push(resolve);
    });
  }
  
  lastLoadTimestamp = now;
  
  // Forcer le chemin local pour l'image du sprite en développement
  // S'assurer que c'est le bon chemin vers le sprite
  const spriteUrl = url || `${window.location.origin}/assets/sprite_mm.png`;
  
  console.log('Chargement du sprite local:', spriteUrl);
  
  // Implémentation réelle pour le chargement du sprite
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log('Sprite chargé avec succès');
      isSpriteLoaded = true;
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(EMOJI_SPRITE_LOADED_KEY, 'true');
          sessionStorage.setItem(EMOJI_SPRITE_LOAD_TIMESTAMP, Date.now().toString());
        }
      } catch (e) {
        console.warn('Erreur lors du stockage du statut de chargement:', e);
      }
      spriteLoadedListeners.forEach(listener => listener());
      spriteLoadedListeners.length = 0;
      resolve();
    };
    img.onerror = (e) => {
      console.error('Erreur lors du chargement du sprite sheet:', e, spriteUrl);
      
      // En cas d'erreur, on considère quand même que c'est chargé
      // pour éviter de bloquer l'interface (fallback en mode natif)
      isSpriteLoaded = true;
      spriteLoadedListeners.forEach(listener => listener());
      spriteLoadedListeners.length = 0;
      
      // On résout quand même la promesse pour ne pas bloquer
      resolve();
    };
    img.src = spriteUrl;
  });
}

/**
 * Ajoute un listener pour être notifié lorsque le sprite sheet est chargé
 * @param listener Fonction à appeler lorsque le sprite est chargé
 */
export function addSpriteLoadedListener(listener: () => void): void {
  if (isSpriteLoaded) {
    // Si déjà chargé, appeler immédiatement
    listener();
  } else {
    // Sinon, ajouter à la liste des listeners
    spriteLoadedListeners.push(listener);
  }
}

/**
 * Précharge le sprite sheet des emojis
 * @param url URL du sprite sheet
 */
export function preloadEmojiSpriteSheet(url: string): void {
  // Vérifier si déjà chargé
  if (isSpriteSheetLoaded()) {
    return;
  }
  
  // Pas besoin de garder la référence à la promesse
  loadSpriteSheet(url).catch(err => {
    console.error('Erreur lors du préchargement du sprite sheet des emojis:', err);
  });
}

/**
 * Réinitialise l'état du chargement du sprite
 * Utile pour les tests ou pour forcer un rechargement
 */
export function resetSpriteSheetLoaded(): void {
  isSpriteLoaded = false;
  lastLoadTimestamp = 0;
  spriteLoadedListeners.length = 0;
  
  try {
    sessionStorage.removeItem(EMOJI_SPRITE_LOADED_KEY);
  } catch (e) {
    // Ignorer les erreurs de sessionStorage
  }
}