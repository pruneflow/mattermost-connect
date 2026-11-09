/**
 * Image service that handles image loading based on authentication method
 * Provides different strategies for token-based vs cookie-based authentication
 */
import { client } from '../api/client';

/**
 * Image loading strategy interface
 */
interface ImageStrategy {
  getUserAvatar(userId: string, lastPictureUpdate?: number): Promise<string>;
  getFileThumbnail(fileId: string): Promise<string>;
  getFilePreview(fileId: string, timestamp?: number): Promise<string>;
  getFileUrl(fileId: string, timestamp?: number): Promise<string>;
}

/**
 * Cookie-based authentication strategy (default Mattermost behavior)
 * Uses direct URLs that rely on HttpOnly cookies for authentication
 */
class CookieImageStrategy implements ImageStrategy {
  async getUserAvatar(userId: string, lastPictureUpdate?: number): Promise<string> {
    const baseUrl = `${client.getUrl()}/api/v4/users/${userId}/image`;
    return lastPictureUpdate ? `${baseUrl}?_=${lastPictureUpdate}` : baseUrl;
  }

  async getFileThumbnail(fileId: string): Promise<string> {
    return `${client.getUrl()}/api/v4/files/${fileId}/thumbnail`;
  }

  async getFilePreview(fileId: string, timestamp?: number): Promise<string> {
    const baseUrl = `${client.getUrl()}/api/v4/files/${fileId}/preview`;
    const previewUrl = timestamp ? `${baseUrl}?_=${timestamp}` : baseUrl;
    // For cookie auth, we can use the URL directly since cookies are sent automatically
    const response = await fetch(previewUrl, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Failed to load preview: ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async getFileUrl(fileId: string, timestamp?: number): Promise<string> {
    // For downloads, also use fetch + blob to force download behavior
    const fileUrl = client.getFileUrl(fileId, timestamp || Date.now());
    const response = await fetch(fileUrl, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}

/**
 * Token-based authentication strategy
 * Uses fetch with Authorization header and blob URLs for secure image loading
 */
class TokenImageStrategy implements ImageStrategy {
  private cache = new Map<string, string>();

  private getAuthHeaders(): Record<string, string> {
    const token = client.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private getCacheKey(url: string): string {
    return url;
  }

  async getUserAvatar(userId: string, lastPictureUpdate?: number): Promise<string> {
    const baseUrl = `${client.getUrl()}/api/v4/users/${userId}/image`;
    const avatarUrl = lastPictureUpdate ? `${baseUrl}?_=${lastPictureUpdate}` : baseUrl;
    return this.fetchAsBlob(avatarUrl);
  }

  async getFileThumbnail(fileId: string): Promise<string> {
    const thumbnailUrl = `${client.getUrl()}/api/v4/files/${fileId}/thumbnail`;
    return this.fetchAsBlob(thumbnailUrl);
  }

  async getFilePreview(fileId: string, timestamp?: number): Promise<string> {
    const baseUrl = `${client.getUrl()}/api/v4/files/${fileId}/preview`;
    const previewUrl = timestamp ? `${baseUrl}?_=${timestamp}` : baseUrl;
    return this.fetchAsBlob(previewUrl);
  }

  async getFileUrl(fileId: string, timestamp?: number): Promise<string> {
    const fileUrl = client.getFileUrl(fileId, timestamp || Date.now());
    return this.fetchAsBlob(fileUrl);
  }

  private async fetchAsBlob(url: string): Promise<string> {
    const cacheKey = this.getCacheKey(url);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Fetch new blob
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Cache the blob URL
    this.cache.set(cacheKey, blobUrl);
    
    return blobUrl;
  }

  clearCache(): void {
    // Revoke all cached blob URLs and clear cache
    for (const blobUrl of this.cache.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.cache.clear();
  }
}

/**
 * Main image service class that selects the appropriate strategy
 */
class ImageService {
  private cookieStrategy = new CookieImageStrategy();
  private tokenStrategy = new TokenImageStrategy();

  private getStrategy(): ImageStrategy {
    // Determine if we're using token authentication
    const token = client.getToken();
    
    // If we have a token, use token strategy
    if (token) {
      return this.tokenStrategy;
    }
    
    // Default to cookie strategy
    return this.cookieStrategy;
  }

  /**
   * Get user avatar URL
   */
  async getUserAvatar(userId: string, lastPictureUpdate?: number): Promise<string> {
    return this.getStrategy().getUserAvatar(userId, lastPictureUpdate);
  }

  /**
   * Get file thumbnail URL
   */
  async getFileThumbnail(fileId: string): Promise<string> {
    return this.getStrategy().getFileThumbnail(fileId);
  }

  /**
   * Get file preview as blob URL (for modal previews)
   */
  async getFilePreview(fileId: string, timestamp?: number): Promise<string> {
    return this.getStrategy().getFilePreview(fileId, timestamp);
  }

  /**
   * Get file download URL
   */
  async getFileUrl(fileId: string, timestamp?: number): Promise<string> {
    return this.getStrategy().getFileUrl(fileId, timestamp);
  }

  /**
   * Cleanup blob URL to prevent memory leaks
   */
  revokeBlobUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Clear all cached blob URLs (useful on logout or token change)
   */
  clearCache(): void {
    // Clear cache for token strategy
    this.tokenStrategy.clearCache();
  }
}

// Export singleton instance
export const imageService = new ImageService();