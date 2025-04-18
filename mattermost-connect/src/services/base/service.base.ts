// src/services/base/service.base.ts
import { User } from "../../types";

/**
 * Interface de base pour tous les services
 * Définit les fonctionnalités communes à tous les services
 */
export interface ServiceBase {
  /**
   * Mode de connexion du service
   */
  readonly mode: "direct" | "proxy" | "custom";

  /**
   * URL de base du service
   */
  readonly baseUrl: string;
}

/**
 * Classe de base pour tous les services
 * Implémente les fonctionnalités communes comme la mise en cache de l'utilisateur courant
 */
export abstract class BaseService implements ServiceBase {
  // Cache pour l'utilisateur courant
  protected _currentUser: User | null = null;

  // URL de base du service
  public readonly baseUrl: string;

  // Mode de fonctionnement du service
  public abstract readonly mode: "direct" | "proxy" | "custom";

  /**
   * Constructeur de la classe de base
   * @param baseUrl URL de base du service
   */
  constructor(baseUrl: string) {
    this.baseUrl = this.normalizeUrl(baseUrl);
  }

  /**
   * Normalise l'URL en supprimant le slash final s'il existe
   * @param url URL à normaliser
   * @returns URL normalisée
   */
  protected normalizeUrl(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  /**
   * Récupère l'utilisateur courant, en utilisant le cache si disponible
   * @returns L'utilisateur courant
   */
  public async getCurrentUser(): Promise<User> {
    // Utiliser le cache si disponible
    if (this._currentUser !== null) {
      return this._currentUser;
    }

    // Sinon, appeler l'API pour récupérer l'utilisateur
    try {
      const user = await this.fetchCurrentUser();
      this._currentUser = user; // Stocker dans le cache
      return user;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération de l'utilisateur courant:",
        error,
      );
      throw error;
    }
  }

  /**
   * Méthode abstraite à implémenter par les services dérivés
   * pour la récupération effective de l'utilisateur
   */
  protected abstract fetchCurrentUser(): Promise<User>;

  /**
   * Méthode pour forcer le rafraîchissement du cache utilisateur
   * Utile après des modifications de profil, permissions, etc.
   */
  public async refreshCurrentUser(): Promise<User> {
    this._currentUser = null; // Vider le cache
    return this.getCurrentUser(); // Récupérer à nouveau l'utilisateur
  }

  /**
   * Définir manuellement l'utilisateur courant
   * Utile lors de l'authentification ou pour les tests
   */
  public setCurrentUser(user: User): void {
    this._currentUser = user;
  }

  /**
   * Récupère l'URL de base du service
   * @returns URL de base
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }
}
