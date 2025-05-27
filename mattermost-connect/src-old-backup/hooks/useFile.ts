// src-simplify/hooks/useFile.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "../api/client";

/**
 * Service singleton pour le cache des fichiers
 * Partagé entre toutes les instances du hook useFile
 */
class FileCacheService {
  private fileInfoCache: Map<string, any> = new Map();
  private previewBlobCache: Map<string, Blob> = new Map();
  private previewUrlCache: Map<string, string> = new Map();

  // Gestion des informations de fichier
  public hasFileInfo(fileId: string): boolean {
    return this.fileInfoCache.has(fileId);
  }

  public getFileInfo(fileId: string): any | null {
    return this.fileInfoCache.get(fileId) || null;
  }

  public setFileInfo(fileId: string, info: any): void {
    this.fileInfoCache.set(fileId, info);
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
}

// Instance singleton
const fileCache = new FileCacheService();

/**
 * Hook unifié pour la gestion des fichiers
 * Source unique de vérité pour toutes les opérations sur les fichiers dans l'application
 * Inclut mise en cache, prévisualisation et opérations communes
 *
 * @param fileId Identifiant du fichier à gérer
 * @returns Interface unifiée pour toutes les opérations sur le fichier
 */
export function useFile(fileId: string | undefined) {
  // État local pour les fichiers et chargements
  const [fileInfo, setFileInfo] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [infoLoading, setInfoLoading] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);

  // Référence pour le nettoyage des URLs d'objets
  const objectUrlRef = useRef<string | null>(null);

  // Map globale des requêtes d'info en cours, partagée entre toutes les instances
  const pendingInfoRequests = useMemo(() => {
    // Utiliser une variable globale pour partager entre les instances
    if (!(window as any).__pendingFileInfoRequests) {
      (window as any).__pendingFileInfoRequests = new Map<
        string,
        Promise<any>
      >();
    }
    return (window as any).__pendingFileInfoRequests;
  }, []);

  // ----------------
  // Chargement des métadonnées du fichier avec déduplication
  // ----------------
  const fetchFileInfo = useCallback(
    async (force = false): Promise<any | null> => {
      if (!fileId) return null;

      // Vérifier le cache si on ne force pas le rechargement
      if (!force && fileCache.hasFileInfo(fileId)) {
        const cachedInfo = fileCache.getFileInfo(fileId);
        setFileInfo(cachedInfo);
        return cachedInfo;
      }

      setInfoLoading(true);

      try {
        // Vérifier si une requête est déjà en cours pour ce fichier
        if (!force && pendingInfoRequests.has(fileId)) {
          // Réutiliser la requête en cours
          const data = await pendingInfoRequests.get(fileId);
          setFileInfo(data);
          return data;
        }

        // Sinon, créer une nouvelle requête
        const token = localStorage.getItem("mattermost_token");

        // Créer la promesse de requête
        const fetchPromise = (async () => {
          try {
            const response = await fetch(
              `${api.getBaseUrl()}/api/v4/files/${fileId}/info`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (!response.ok) {
              throw new Error(`Failed to fetch file info: ${response.status}`);
            }

            const data = await response.json();

            // Mettre à jour le cache
            fileCache.setFileInfo(fileId, data);

            // Retirer de la liste des requêtes en cours
            pendingInfoRequests.delete(fileId);

            return data;
          } catch (error) {
            // Retirer de la liste des requêtes en cours en cas d'erreur aussi
            pendingInfoRequests.delete(fileId);
            throw error;
          }
        })();

        // Enregistrer la promesse dans la map globale
        pendingInfoRequests.set(fileId, fetchPromise);

        // Attendre la résolution et mettre à jour l'état local
        const data = await fetchPromise;
        setFileInfo(data);
        return data;
      } catch (error) {
        console.error("Error fetching file info:", error);
        return null;
      } finally {
        setInfoLoading(false);
      }
    },
    [fileId, pendingInfoRequests],
  );

  // Map globale des requêtes de prévisualisation en cours, partagée entre toutes les instances
  const pendingPreviewRequests = useMemo(() => {
    // Utiliser une variable globale pour partager entre les instances
    if (!(window as any).__pendingFilePreviewRequests) {
      (window as any).__pendingFilePreviewRequests = new Map<
        string,
        Promise<string>
      >();
    }
    return (window as any).__pendingFilePreviewRequests;
  }, []);

  // ----------------
  // Chargement de l'aperçu du fichier avec déduplication
  // ----------------
  const fetchPreview = useCallback(
    async (force = false): Promise<string | null> => {
      if (!fileId) return null;

      // Vérifier le cache si on ne force pas le rechargement
      if (!force && fileCache.hasPreviewUrl(fileId)) {
        const cachedUrl = fileCache.getPreviewUrl(fileId);
        setPreviewUrl(cachedUrl);
        return cachedUrl;
      }

      setPreviewLoading(true);

      try {
        // Vérifier si une requête est déjà en cours pour ce fichier
        if (!force && pendingPreviewRequests.has(fileId)) {
          // Réutiliser la requête en cours
          const url = await pendingPreviewRequests.get(fileId);
          setPreviewUrl(url);
          return url;
        }

        // Sinon, créer une nouvelle requête
        const token = localStorage.getItem("mattermost_token");

        // Créer la promesse de requête
        const fetchPromise = (async () => {
          try {
            // Nettoyer l'URL précédente si elle existe
            if (objectUrlRef.current) {
              URL.revokeObjectURL(objectUrlRef.current);
              objectUrlRef.current = null;
            }

            const response = await fetch(
              `${api.getBaseUrl()}/api/v4/files/${fileId}/preview`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (!response.ok) {
              throw new Error(`Failed to load preview: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Stocker la référence pour le nettoyage
            objectUrlRef.current = url;

            // Mettre à jour le cache
            fileCache.setPreviewBlob(fileId, blob);
            fileCache.setPreviewUrl(fileId, url);

            // Retirer de la liste des requêtes en cours
            pendingPreviewRequests.delete(fileId);

            return url;
          } catch (error) {
            // Retirer de la liste des requêtes en cours en cas d'erreur aussi
            pendingPreviewRequests.delete(fileId);
            throw error;
          }
        })();

        // Enregistrer la promesse dans la map globale
        pendingPreviewRequests.set(fileId, fetchPromise);

        // Attendre la résolution et mettre à jour l'état local
        const url = await fetchPromise;
        setPreviewUrl(url);
        return url;
      } catch (error) {
        console.error("Error loading file preview:", error);
        return null;
      } finally {
        setPreviewLoading(false);
      }
    },
    [fileId, pendingPreviewRequests],
  );

  // ----------------
  // Téléchargement du fichier complet
  // ----------------
  const downloadFile = useCallback(async (): Promise<void> => {
    if (!fileId || !fileInfo) return;

    setDownloadLoading(true);
    const token = localStorage.getItem("mattermost_token");

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${api.getBaseUrl()}/api/v4/files/${fileId}`, true);
      xhr.responseType = "blob";

      // Ajouter le token d'authentification
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.onload = function () {
        if (this.status === 200) {
          // Créer un blob URL à partir de la réponse
          const blob = new Blob([this.response]);
          const url = window.URL.createObjectURL(blob);

          // Créer un élément de lien et déclencher le téléchargement
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = fileInfo.name || `file-${fileId}`;
          document.body.appendChild(a);
          a.click();

          // Nettoyer
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setDownloadLoading(false);
          }, 100);
        } else {
          console.error("Failed to download file:", this.status);
          setDownloadLoading(false);
        }
      };

      xhr.onerror = function () {
        console.error("XHR error during file download");
        setDownloadLoading(false);
      };

      xhr.send();
    } catch (error) {
      console.error("Error downloading file:", error);
      setDownloadLoading(false);
    }
  }, [fileId, fileInfo]);

  // ----------------
  // Chargement initial au montage
  // ----------------
  useEffect(() => {
    if (fileId) {
      // Toujours charger les infos du fichier au montage
      if (!fileInfo && !infoLoading) {
        fetchFileInfo();
      }

      // Pour les images, précharger la prévisualisation
      if (
        fileInfo?.mime_type?.startsWith("image/") &&
        !previewUrl &&
        !previewLoading
      ) {
        fetchPreview();
      }
    }
  }, [
    fileId,
    fileInfo,
    infoLoading,
    previewUrl,
    previewLoading,
    fetchFileInfo,
    fetchPreview,
  ]);

  // ----------------
  // Nettoyage des ressources au démontage
  // ----------------
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // ----------------
  // Utilitaires pour déterminer le type de fichier
  // ----------------
  const getFileType = useCallback((): string => {
    if (!fileInfo) return "unknown";

    const { mime_type, extension } = fileInfo;

    if (mime_type?.startsWith("image/")) return "image";
    if (mime_type?.startsWith("video/")) return "video";
    if (mime_type?.startsWith("audio/")) return "audio";
    if (mime_type === "application/pdf") return "pdf";
    if (
      mime_type?.includes("spreadsheet") ||
      extension === "xlsx" ||
      extension === "xls"
    )
      return "spreadsheet";
    if (
      mime_type?.includes("document") ||
      extension === "docx" ||
      extension === "doc"
    )
      return "document";

    return "file";
  }, [fileInfo]);

  // Formatage de la taille du fichier
  const formatFileSize = useCallback((size?: number): string => {
    if (!size) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    let formattedSize = size;
    let unitIndex = 0;

    while (formattedSize >= 1024 && unitIndex < units.length - 1) {
      formattedSize /= 1024;
      unitIndex++;
    }

    return `${formattedSize.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  // ----------------
  // API exposée par le hook
  // ----------------
  return {
    // Données
    fileInfo,
    previewUrl,

    // États de chargement
    isInfoLoading: infoLoading,
    isPreviewLoading: previewLoading,
    isDownloading: downloadLoading,
    isLoading: infoLoading || previewLoading,

    // Actions
    fetchFileInfo,
    fetchPreview,
    downloadFile,

    // URLs utilitaires
    getDownloadUrl: () =>
      fileId ? `${api.getBaseUrl()}/api/v4/files/${fileId}` : "",
    getPreviewUrl: () =>
      fileId ? `${api.getBaseUrl()}/api/v4/files/${fileId}/preview` : "",

    // Propriétés du fichier
    fileId,
    fileName: fileInfo?.name || "",
    fileMimeType: fileInfo?.mime_type || "",
    fileExtension: fileInfo?.extension || "",
    fileSize: fileInfo?.size || 0,

    // Utilitaires
    getFileType,
    formatFileSize,

    // Méthodes de détection de type
    isImage: () => fileInfo?.mime_type?.startsWith("image/") || false,
    isVideo: () => fileInfo?.mime_type?.startsWith("video/") || false,
    isAudio: () => fileInfo?.mime_type?.startsWith("audio/") || false,
    isPdf: () => fileInfo?.mime_type === "application/pdf" || false,
    isText: () => fileInfo?.mime_type?.startsWith("text/") || false,
    isViewable: () => {
      if (!fileInfo?.mime_type) return false;
      return (
        fileInfo.mime_type.startsWith("image/") ||
        fileInfo.mime_type === "application/pdf" ||
        fileInfo.mime_type.startsWith("text/")
      );
    },
  };
}
