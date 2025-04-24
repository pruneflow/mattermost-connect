// src/core/services/cache.service.ts
/**
 * Service de cache avancé pour optimiser les performances des requêtes
 * Implémente un cache LRU (Least Recently Used) avec TTL et stratégies intelligentes
 */

/**
 * Options de configuration du cache
 */
interface CacheOptions<T = any> {
  /** Durée de vie par défaut des entrées en ms */
  ttl?: number;

  /** Taille maximale du cache */
  maxSize?: number;

  /** Niveau de journalisation (0: aucun, 1: erreurs, 2: avertissements, 3: info) */
  logLevel?: number;

  /** Préfixe à ajouter aux clés */
  keyPrefix?: string;

  /** Fonction de sérialisation des valeurs */
  serialize?: (value: T) => string;

  /** Fonction de désérialisation des valeurs */
  deserialize?: (data: string) => T;

  /** Fonction pour déterminer si une entrée doit être invalidée */
  invalidator?: (entry: CacheEntry<T>, key: string) => boolean;

  /** Storage pour persister le cache (localStorage, sessionStorage) */
  storage?: Storage;
}

/**
 * Entrée de cache avec métadonnées
 */
type CacheEntry<T> = {
  /** Données stockées */
  data: T;

  /** Timestamp de création/mise à jour */
  timestamp: number;

  /** Clé associée à l'entrée */
  key: string;

  /** Durée de vie spécifique en ms (si différente de celle par défaut) */
  ttl?: number;

  /** Métadonnées personnalisées */
  meta?: Record<string, any>;
};

/**
 * Résultat d'une opération de cache
 */
interface CacheResult<T> {
  /** Données récupérées */
  data: T | null;

  /** Indique si les données proviennent du cache */
  fromCache: boolean;

  /** Timestamp de l'entrée de cache */
  timestamp?: number;

  /** Informations sur l'expiration */
  expires?: {
    /** Date d'expiration */
    at: number;

    /** Durée restante en ms */
    remaining: number;
  };
}

/**
 * Service de cache avancé et typé
 *
 * @template T - Type des données mises en cache
 */
export class CacheService<T = any> {
  /** Map interne pour stocker les entrées */
  private cache: Map<string, CacheEntry<T>> = new Map();

  /** Ordre des clés pour la gestion LRU */
  private keyOrder: string[] = [];

  /** Durée de vie par défaut */
  private ttl: number;

  /** Taille maximum du cache */
  private maxSize: number;

  /** Niveau de journalisation */
  private logLevel: number;

  /** Préfixe pour les clés */
  private keyPrefix: string;

  /** Callback d'invalidation personnalisée */
  private invalidator?: (entry: CacheEntry<T>, key: string) => boolean;

  /** Storage pour la persistance */
  private storage?: Storage;

  /** Fonctions de sérialisation/désérialisation */
  private serialize: (value: T) => string;
  private deserialize: (data: string) => T;

  /**
   * Crée une nouvelle instance du service de cache
   */
  constructor(options: CacheOptions<T> = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes par défaut
    this.maxSize = options.maxSize || 100;
    this.logLevel = options.logLevel || 1;
    this.keyPrefix = options.keyPrefix || "";
    this.invalidator = options.invalidator;
    this.storage = options.storage;

    // Fonctions de sérialisation par défaut
    this.serialize = options.serialize || ((value: T) => JSON.stringify(value));
    this.deserialize =
      options.deserialize || ((data: string) => JSON.parse(data) as T);

    // Restaurer le cache depuis le storage si disponible
    this.restoreFromStorage();
  }

  /**
   * Récupère une entrée du cache
   *
   * @param key Clé de l'entrée
   * @returns Données associées à la clé ou undefined si absente/expirée
   */
  public get(key: string): T | undefined {
    const prefixedKey = this.getPrefixedKey(key);
    const entry = this.cache.get(prefixedKey);

    if (!entry) {
      this.log(3, `Cache miss: ${key}`);
      return undefined;
    }

    // Vérifier si l'entrée est expirée
    if (this.isExpired(entry)) {
      this.log(3, `Cache expired: ${key}`);
      this.delete(key);
      return undefined;
    }

    // Vérifier l'invalidation personnalisée
    if (this.invalidator && this.invalidator(entry, key)) {
      this.log(3, `Cache invalidated: ${key}`);
      this.delete(key);
      return undefined;
    }

    // Mettre à jour l'ordre LRU
    this.touch(prefixedKey);
    this.log(3, `Cache hit: ${key}`);

    return entry.data;
  }

  /**
   * Récupère une entrée avec des métadonnées
   *
   * @param key Clé de l'entrée
   * @returns Objet contenant les données et les métadonnées
   */
  public getWithMeta(key: string): CacheResult<T> {
    const prefixedKey = this.getPrefixedKey(key);
    const entry = this.cache.get(prefixedKey);

    if (
      !entry ||
      this.isExpired(entry) ||
      (this.invalidator && this.invalidator(entry, key))
    ) {
      return {
        data: null,
        fromCache: false,
      };
    }

    // Mettre à jour l'ordre LRU
    this.touch(prefixedKey);

    // Calcul de l'expiration
    const entryTtl = entry.ttl || this.ttl;
    const expiresAt = entry.timestamp + entryTtl;
    const remaining = Math.max(0, expiresAt - Date.now());

    return {
      data: entry.data,
      fromCache: true,
      timestamp: entry.timestamp,
      expires: {
        at: expiresAt,
        remaining,
      },
    };
  }

  /**
   * Ajoute ou met à jour une entrée dans le cache
   *
   * @param key Clé de l'entrée
   * @param data Données à stocker
   * @param options Options spécifiques pour cette entrée
   */
  public set(
    key: string,
    data: T,
    options: { ttl?: number; meta?: Record<string, any> } = {},
  ): void {
    const prefixedKey = this.getPrefixedKey(key);

    // Créer ou mettre à jour l'entrée
    this.cache.set(prefixedKey, {
      data,
      timestamp: Date.now(),
      key: prefixedKey,
      ttl: options.ttl,
      meta: options.meta,
    });

    // Mettre à jour l'ordre LRU
    this.touch(prefixedKey);

    // Nettoyer le cache si nécessaire
    this.cleanup();

    // Persister si un storage est configuré
    this.persistToStorage();

    this.log(3, `Cache set: ${key}`);
  }

  /**
   * Supprime une entrée du cache
   *
   * @param key Clé de l'entrée à supprimer
   * @returns true si l'entrée a été supprimée, false sinon
   */
  public delete(key: string): boolean {
    const prefixedKey = this.getPrefixedKey(key);
    const deleted = this.cache.delete(prefixedKey);

    if (deleted) {
      const idx = this.keyOrder.indexOf(prefixedKey);
      if (idx > -1) {
        this.keyOrder.splice(idx, 1);
      }

      // Persister si un storage est configuré
      this.persistToStorage();

      this.log(3, `Cache delete: ${key}`);
    }

    return deleted;
  }

  /**
   * Vérifie si une entrée est présente et valide dans le cache
   *
   * @param key Clé à vérifier
   * @returns true si l'entrée existe et est valide
   */
  public has(key: string): boolean {
    const prefixedKey = this.getPrefixedKey(key);
    const entry = this.cache.get(prefixedKey);

    if (!entry) {
      return false;
    }

    // Vérifier si l'entrée est expirée
    if (
      this.isExpired(entry) ||
      (this.invalidator && this.invalidator(entry, key))
    ) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Supprime toutes les entrées du cache
   */
  public clear(): void {
    this.cache.clear();
    this.keyOrder = [];

    // Supprimer du storage si configuré
    if (this.storage && this.keyPrefix) {
      this.storage.removeItem(`cache_${this.keyPrefix}_data`);
      this.storage.removeItem(`cache_${this.keyPrefix}_order`);
    }

    this.log(2, "Cache cleared");
  }

  /**
   * Nettoie les entrées expirées et limite la taille du cache
   *
   * @returns Nombre d'entrées supprimées
   */
  public cleanup(): number {
    let removedCount = 0;

    // Supprimer les entrées expirées
    const now = Date.now();
    const expiredEntries: string[] = [];

    this.cache.forEach((entry, key) => {
      const entryTtl = entry.ttl || this.ttl;
      if (
        now - entry.timestamp > entryTtl ||
        (this.invalidator &&
          this.invalidator(entry, this.getUnprefixedKey(key)))
      ) {
        expiredEntries.push(key);
      }
    });

    expiredEntries.forEach((key) => {
      this.cache.delete(key);
      const idx = this.keyOrder.indexOf(key);
      if (idx > -1) {
        this.keyOrder.splice(idx, 1);
      }
      removedCount++;
    });

    // Limiter la taille du cache en supprimant les entrées les plus anciennes
    while (this.keyOrder.length > this.maxSize) {
      const oldestKey = this.keyOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        removedCount++;
      }
    }

    // Persister si un storage est configuré et des entrées ont été supprimées
    if (removedCount > 0) {
      this.persistToStorage();
      this.log(3, `Cleanup removed ${removedCount} entries`);
    }

    return removedCount;
  }

  /**
   * Récupère toutes les clés du cache
   *
   * @returns Liste des clés (sans préfixe)
   */
  public keys(): string[] {
    // Retourner les clés sans le préfixe
    return Array.from(this.cache.keys()).map((key) =>
      this.getUnprefixedKey(key),
    );
  }

  /**
   * Récupère les entrées par préfixe de clé
   *
   * @param prefix Préfixe de clé à rechercher
   * @returns Objet avec les clés/valeurs correspondantes
   */
  public getByPrefix(prefix: string): Record<string, T> {
    const result: Record<string, T> = {};
    const searchPrefix = this.getPrefixedKey(prefix);

    this.cache.forEach((entry, key) => {
      if (
        key.startsWith(searchPrefix) &&
        !this.isExpired(entry) &&
        !(
          this.invalidator &&
          this.invalidator(entry, this.getUnprefixedKey(key))
        )
      ) {
        // Extraire la clé sans le préfixe de service
        const resultKey = this.getUnprefixedKey(key);
        result[resultKey] = entry.data;
        this.touch(key);
      }
    });

    return result;
  }

  /**
   * Supprime les entrées par préfixe de clé
   *
   * @param prefix Préfixe des clés à supprimer
   * @returns Nombre d'entrées supprimées
   */
  public deleteByPrefix(prefix: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    const searchPrefix = this.getPrefixedKey(prefix);

    this.cache.forEach((_, key) => {
      if (key.startsWith(searchPrefix)) {
        keysToDelete.push(key);
        count++;
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      const idx = this.keyOrder.indexOf(key);
      if (idx > -1) {
        this.keyOrder.splice(idx, 1);
      }
    });

    // Persister si un storage est configuré et des entrées ont été supprimées
    if (count > 0) {
      this.persistToStorage();
      this.log(3, `Deleted ${count} entries by prefix: ${prefix}`);
    }

    return count;
  }

  /**
   * Rafraîchit une entrée en mettant à jour son timestamp
   *
   * @param key Clé de l'entrée à rafraîchir
   * @returns true si l'entrée a été rafraîchie
   */
  public refresh(key: string): boolean {
    const prefixedKey = this.getPrefixedKey(key);
    const entry = this.cache.get(prefixedKey);

    if (!entry) {
      return false;
    }

    // Mettre à jour le timestamp
    entry.timestamp = Date.now();
    this.touch(prefixedKey);

    // Persister si un storage est configuré
    this.persistToStorage();

    this.log(3, `Cache entry refreshed: ${key}`);
    return true;
  }

  /**
   * Récupère une entrée du cache ou exécute la fonction pour la récupérer
   *
   * @param key Clé de l'entrée
   * @param fetcher Fonction à exécuter si l'entrée n'est pas en cache
   * @param options Options pour cette opération
   * @returns Résultat avec les données et l'indication de provenance
   */
  public async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      meta?: Record<string, any>;
    } = {},
  ): Promise<CacheResult<T>> {
    // Si forceRefresh est spécifié, ignorer le cache
    if (!options.forceRefresh) {
      const cachedResult = this.getWithMeta(key);

      if (cachedResult.data !== null) {
        return cachedResult;
      }
    }

    // Exécuter la fonction pour récupérer les données
    try {
      const data = await fetcher();

      // Mettre en cache si les données sont valides
      if (data !== null && data !== undefined) {
        this.set(key, data, {
          ttl: options.ttl,
          meta: options.meta,
        });
      }

      return {
        data,
        fromCache: false,
      };
    } catch (error) {
      this.log(1, `Error fetching data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Précharge les données dans le cache
   *
   * @param key Clé de l'entrée
   * @param fetcher Fonction pour récupérer les données
   * @param options Options pour cette opération
   * @returns Promesse résolue avec les données
   */
  public async prefetch(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      skipIfCached?: boolean;
      meta?: Record<string, any>;
    } = {},
  ): Promise<T> {
    // Si skipIfCached est true et l'entrée est en cache, retourner les données du cache
    if (options.skipIfCached && this.has(key)) {
      const cachedData = this.get(key);
      if (cachedData !== undefined) {
        this.log(3, `Prefetch: using cached data for ${key}`);
        return cachedData;
      }
    }

    // Exécuter la fonction pour récupérer les données
    try {
      const data = await fetcher();

      // Mettre en cache si les données sont valides
      if (data !== null && data !== undefined) {
        this.set(key, data, {
          ttl: options.ttl,
          meta: options.meta,
        });
      }

      this.log(3, `Prefetch: fetched data for ${key}`);
      return data;
    } catch (error) {
      this.log(1, `Error prefetching data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Définit plusieurs entrées en une seule opération
   *
   * @param entries Objet avec clés/valeurs à mettre en cache
   * @param options Options pour ces entrées
   */
  public setMany(
    entries: Record<string, T>,
    options: { ttl?: number; meta?: Record<string, any> } = {},
  ): void {
    let entriesCount = 0;

    Object.entries(entries).forEach(([key, data]) => {
      this.set(key, data, options);
      entriesCount++;
    });

    this.log(3, `Set ${entriesCount} entries in bulk operation`);
  }

  /**
   * Récupère plusieurs entrées en une seule opération
   *
   * @param keys Liste des clés à récupérer
   * @returns Objet avec les entrées trouvées
   */
  public getMany(keys: string[]): Record<string, T> {
    const result: Record<string, T> = {};
    let hitCount = 0;

    keys.forEach((key) => {
      const data = this.get(key);
      if (data !== undefined) {
        result[key] = data;
        hitCount++;
      }
    });

    this.log(3, `Bulk get: ${hitCount}/${keys.length} cache hits`);
    return result;
  }

  /**
   * Met à jour partiellement une entrée de type objet
   *
   * @param key Clé de l'entrée
   * @param partialData Données partielles à fusionner
   * @returns true si l'entrée a été mise à jour
   */
  public update(key: string, partialData: Partial<T>): boolean {
    const prefixedKey = this.getPrefixedKey(key);
    const entry = this.cache.get(prefixedKey);

    if (!entry || this.isExpired(entry)) {
      return false;
    }

    // Vérifier si les données sont un objet
    if (typeof entry.data !== "object" || entry.data === null) {
      this.log(2, `Cannot update non-object cache entry: ${key}`);
      return false;
    }

    // Fusionner les données
    entry.data = { ...(entry.data as object), ...partialData } as T;
    entry.timestamp = Date.now();
    this.touch(prefixedKey);

    // Persister si un storage est configuré
    this.persistToStorage();

    this.log(3, `Cache entry updated: ${key}`);
    return true;
  }

  /**
   * Vérifie si une entrée du cache est expirée
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const entryTtl = entry.ttl || this.ttl;
    return Date.now() - entry.timestamp > entryTtl;
  }

  /**
   * Met à jour l'ordre LRU
   */
  private touch(key: string): void {
    const idx = this.keyOrder.indexOf(key);
    if (idx > -1) {
      this.keyOrder.splice(idx, 1);
    }
    this.keyOrder.push(key);
  }

  /**
   * Ajoute le préfixe à une clé
   */
  private getPrefixedKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  /**
   * Retire le préfixe d'une clé
   */
  private getUnprefixedKey(prefixedKey: string): string {
    if (!this.keyPrefix) return prefixedKey;
    const prefix = `${this.keyPrefix}:`;
    return prefixedKey.startsWith(prefix)
      ? prefixedKey.substring(prefix.length)
      : prefixedKey;
  }

  /**
   * Journalise un message selon le niveau configuré
   */
  private log(level: number, message: string, data?: any): void {
    if (this.logLevel >= level) {
      if (data) {
        console.log(`[CacheService] ${message}`, data);
      } else {
        console.log(`[CacheService] ${message}`);
      }
    }
  }

  /**
   * Persiste le cache dans le storage configuré
   */
  private persistToStorage(): void {
    if (!this.storage || !this.keyPrefix) {
      return;
    }

    try {
      // Convertir le cache en format serialisable
      const cacheData: Record<string, any> = {};
      this.cache.forEach((entry, key) => {
        cacheData[key] = {
          ...entry,
          data: this.serialize(entry.data),
        };
      });

      // Stocker les données et l'ordre des clés
      this.storage.setItem(
        `cache_${this.keyPrefix}_data`,
        JSON.stringify(cacheData),
      );
      this.storage.setItem(
        `cache_${this.keyPrefix}_order`,
        JSON.stringify(this.keyOrder),
      );
    } catch (error) {
      this.log(1, "Error persisting cache to storage:", error);
    }
  }

  /**
   * Restaure le cache depuis le storage configuré
   */
  private restoreFromStorage(): void {
    if (!this.storage || !this.keyPrefix) {
      return;
    }

    try {
      // Récupérer les données du cache
      const cacheDataStr = this.storage.getItem(`cache_${this.keyPrefix}_data`);
      const keyOrderStr = this.storage.getItem(`cache_${this.keyPrefix}_order`);

      if (!cacheDataStr || !keyOrderStr) {
        return;
      }

      // Parser les données
      const cacheData = JSON.parse(cacheDataStr);
      this.keyOrder = JSON.parse(keyOrderStr);

      // Reconstruire le cache
      Object.entries(cacheData).forEach(([key, entryData]: [string, any]) => {
        try {
          const data = this.deserialize(entryData.data);
          this.cache.set(key, {
            ...entryData,
            data,
          });
        } catch (error) {
          this.log(1, `Error deserializing cache entry ${key}:`, error);
        }
      });

      // Nettoyer les entrées expirées
      this.cleanup();

      this.log(2, `Restored ${this.cache.size} entries from storage`);
    } catch (error) {
      this.log(1, "Error restoring cache from storage:", error);
    }
  }
}
