// src/services/base.service.ts
import { User, MattermostService } from "../types";

/**
 * Classe de base pour les services Mattermost
 * Implémente les fonctionnalités communes comme la mise en cache de l'utilisateur courant
 */
export abstract class BaseService implements Partial<MattermostService> {
  // Cache pour l'utilisateur courant
  protected _currentUser: User | null = null;

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
}
