// src/core/services/cache.service.ts
/**
 * Service de cache pour optimiser les performances des requêtes
 * Implémente un cache LRU (Least Recently Used) avec TTL
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  key: string;
};

export class CacheService<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private keyOrder: string[] = [];
  private ttl: number;
  private maxSize: number;

  constructor(
    options: {
      ttl?: number; // Durée de vie du cache en ms (défaut: 5 minutes)
      maxSize?: number; // Taille maximum du cache (défaut: 100 entrées)
    } = {},
  ) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes par défaut
    this.maxSize = options.maxSize || 100;
  }

  /**
   * Récupère une entrée du cache
   */
  public get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Vérifier si l'entrée est expirée
    if (this.isExpired(entry)) {
      this.delete(key);
      return undefined;
    }

    // Mettre à jour l'ordre LRU
    this.touch(key);

    return entry.data;
  }

  /**
   * Ajoute ou met à jour une entrée dans le cache
   */
  public set(key: string, data: T): void {
    // Créer ou mettre à jour l'entrée
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });

    // Mettre à jour l'ordre LRU
    this.touch(key);

    // Nettoyer le cache si nécessaire
    this.cleanup();
  }

  /**
   * Supprime une entrée du cache
   */
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    if (deleted) {
      const idx = this.keyOrder.indexOf(key);
      if (idx > -1) {
        this.keyOrder.splice(idx, 1);
      }
    }

    return deleted;
  }

  /**
   * Vérifie si une entrée est présente et valide dans le cache
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Vérifier si l'entrée est expirée
    if (this.isExpired(entry)) {
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
  }

  /**
   * Nettoie les entrées expirées et limite la taille du cache
   */
  public cleanup(): void {
    // Supprimer les entrées expirées
    const now = Date.now();
    const expiredEntries: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        expiredEntries.push(key);
      }
    });

    expiredEntries.forEach((key) => this.delete(key));

    // Limiter la taille du cache en supprimant les entrées les plus anciennes
    while (this.keyOrder.length > this.maxSize) {
      const oldestKey = this.keyOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Récupère toutes les clés du cache
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Récupère les entrées par préfixe de clé
   */
  public getByPrefix(prefix: string): Record<string, T> {
    const result: Record<string, T> = {};

    this.cache.forEach((entry, key) => {
      if (key.startsWith(prefix) && !this.isExpired(entry)) {
        result[key] = entry.data;
        this.touch(key);
      }
    });

    return result;
  }

  /**
   * Supprime les entrées par préfixe de clé
   */
  public deleteByPrefix(prefix: string): number {
    let count = 0;
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
        count++;
      }
    });

    keysToDelete.forEach((key) => this.delete(key));

    return count;
  }

  /**
   * Vérifie si une entrée du cache est expirée
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttl;
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
}
