// src/core/services/fileCache.ts
import { FileInfo } from "../../types";

/**
 * Service singleton pour le cache des fichiers
 * Partagé entre toutes les instances du hook useFile
 */
class FileCacheService {
  private fileInfoCache: Map<string, FileInfo> = new Map();
  private previewBlobCache: Map<string, Blob> = new Map();
  private previewUrlCache: Map<string, string> = new Map();
  
  // Gestion des informations de fichier
  public hasFileInfo(fileId: string): boolean {
    return this.fileInfoCache.has(fileId);
  }
  
  public getFileInfo(fileId: string): FileInfo | null {
    return this.fileInfoCache.get(fileId) || null;
  }
  
  public setFileInfo(fileId: string, info: FileInfo): void {
    this.fileInfoCache.set(fileId, info);
  }
  
  // Gestion des blobs de prévisualisation
  public hasPreviewBlob(fileId: string): boolean {
    return this.previewBlobCache.has(fileId);
  }
  
  public getPreviewBlob(fileId: string): Blob | null {
    return this.previewBlobCache.get(fileId) || null;
  }
  
  public setPreviewBlob(fileId: string, blob: Blob): void {
    this.previewBlobCache.set(fileId, blob);
  }
  
  // Gestion des URLs de prévisualisation
  public hasPreviewUrl(fileId: string): boolean {
    return this.previewUrlCache.has(fileId);
  }
  
  public getPreviewUrl(fileId: string): string | null {
    return this.previewUrlCache.get(fileId) || null;
  }
  
  public setPreviewUrl(fileId: string, url: string): void {
    this.previewUrlCache.set(fileId, url);
  }
  
  // Nettoyage et invalidation
  public clearFile(fileId: string): void {
    this.fileInfoCache.delete(fileId);
    
    // Nettoyer le blob et l'URL d'aperçu
    if (this.previewUrlCache.has(fileId)) {
      try {
        URL.revokeObjectURL(this.previewUrlCache.get(fileId)!);
      } catch (e) {
        // Ignorer les erreurs pendant le nettoyage
      }
      this.previewUrlCache.delete(fileId);
    }
    
    this.previewBlobCache.delete(fileId);
  }
  
  // Nettoyage de tout le cache
  public clearAll(): void {
    // Révoquer toutes les URLs d'objets avant de vider le cache
    this.previewUrlCache.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignorer les erreurs pendant le nettoyage
      }
    });
    
    this.fileInfoCache.clear();
    this.previewBlobCache.clear();
    this.previewUrlCache.clear();
  }
  
  // Récupérer des statistiques sur l'utilisation du cache
  public getStats(): { infoCount: number; blobCount: number; urlCount: number } {
    return {
      infoCount: this.fileInfoCache.size,
      blobCount: this.previewBlobCache.size,
      urlCount: this.previewUrlCache.size
    };
  }
}

// Instance singleton
const fileCache = new FileCacheService();

// Fonction pour obtenir l'instance du cache
export function getGlobalFileCache(): FileCacheService {
  return fileCache;
}