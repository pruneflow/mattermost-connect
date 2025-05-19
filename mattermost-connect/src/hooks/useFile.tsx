// src/hooks/useFile.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FileInfo } from '../types';
import { apiClient } from '../core/api/client';
import { messageService } from '../core/services/messageService';
import { getGlobalFileCache } from '../core/services/fileCache';
import { handleError } from '../core/store/errorStore';
import { ErrorSource } from '../types';
import { useFileInfoQuery } from '../core/api/queries/messageQueries';

/**
 * Hook unifié pour la gestion des fichiers
 * Source unique de vérité pour toutes les opérations sur les fichiers dans l'application
 * Inclut mise en cache, prévisualisation et opérations communes
 * 
 * @param fileId Identifiant du fichier à gérer
 * @returns Interface unifiée pour toutes les opérations sur le fichier
 */
export function useFile(fileId: string | undefined) {
  // Utiliser React Query pour les infos du fichier (pour compatibilité avec le reste de l'app)
  const fileInfoQuery = useFileInfoQuery(fileId);
  
  // Map globale des requêtes d'info en cours, partagée entre toutes les instances
  const pendingInfoRequests = useMemo(() => {
    // Utiliser une variable globale pour partager entre les instances
    if (!(window as any).__pendingFileInfoRequests) {
      (window as any).__pendingFileInfoRequests = new Map<string, Promise<any>>();
    }
    return (window as any).__pendingFileInfoRequests;
  }, []);
  
  // État local pour les prévisualisations et le chargement
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  
  // Référence pour le nettoyage des URLs d'objets
  const objectUrlRef = useRef<string | null>(null);
  
  // Cache global partagé entre toutes les instances
  const fileCache = useMemo(() => getGlobalFileCache(), []);
  
  // Déterminer si on a déjà les infos du fichier
  const fileInfo = useMemo(() => {
    if (fileInfoQuery.data) {
      return fileInfoQuery.data;
    }
    return fileId ? fileCache.getFileInfo(fileId) : null;
  }, [fileId, fileInfoQuery.data, fileCache]);
  
  // Map globale des requêtes de prévisualisation en cours, partagée entre toutes les instances
  const pendingPreviewRequests = useMemo(() => {
    // Utiliser une variable globale pour partager entre les instances
    if (!(window as any).__pendingFilePreviewRequests) {
      (window as any).__pendingFilePreviewRequests = new Map<string, Promise<string>>();
    }
    return (window as any).__pendingFilePreviewRequests;
  }, []);

  // ----------------
  // Chargement de l'aperçu du fichier avec déduplication
  // ----------------
  const fetchPreview = useCallback(async (force = false): Promise<string | null> => {
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
        console.log(`Reusing pending request for file preview: ${fileId}`);
        // Réutiliser la requête en cours
        const url = await pendingPreviewRequests.get(fileId);
        setPreviewUrl(url);
        return url;
      }
      
      // Sinon, créer une nouvelle requête
      const token = localStorage.getItem('mattermost_token');
      
      // Créer la promesse de requête
      const fetchPromise = (async () => {
        try {
          // Nettoyer l'URL précédente si elle existe
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          
          const response = await fetch(`${apiClient.getBaseUrl()}/api/v4/files/${fileId}/preview`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
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
      handleError(error as Error, ErrorSource.API, undefined, {
        method: "fetchPreview",
        fileId
      });
      return null;
    } finally {
      setPreviewLoading(false);
    }
  }, [fileId, fileCache, pendingPreviewRequests]);
  
  // ----------------
  // Téléchargement du fichier complet
  // ----------------
  const downloadFile = useCallback(async (): Promise<void> => {
    if (!fileId || !fileInfo) return;
    
    setDownloadLoading(true);
    const token = localStorage.getItem('mattermost_token');
    
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${apiClient.getBaseUrl()}/api/v4/files/${fileId}`, true);
      xhr.responseType = 'blob';
      
      // Ajouter le token d'authentification
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = function() {
        if (this.status === 200) {
          // Créer un blob URL à partir de la réponse
          const blob = new Blob([this.response]);
          const url = window.URL.createObjectURL(blob);
          
          // Créer un élément de lien et déclencher le téléchargement
          const a = document.createElement('a');
          a.style.display = 'none';
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
          console.error('Failed to download file:', this.status);
          setDownloadLoading(false);
        }
      };
      
      xhr.onerror = function() {
        console.error('XHR error during file download');
        setDownloadLoading(false);
      };
      
      xhr.send();
    } catch (error) {
      handleError(error as Error, ErrorSource.API, undefined, {
        method: "downloadFile",
        fileId
      });
      setDownloadLoading(false);
    }
  }, [fileId, fileInfo]);
  
  // ----------------
  // Mettre à jour le statut du cache lorsque les données React Query changent
  // et précharger les prévisualisations d'images
  // ----------------
  useEffect(() => {
    if (fileId) {
      // Mettre à jour le cache lorsque les données React Query changent
      if (fileInfoQuery.data) {
        fileCache.setFileInfo(fileId, fileInfoQuery.data);
      }
      
      // Pour les images, précharger la prévisualisation
      const isImage = fileInfo?.mime_type?.startsWith('image/');
      if (isImage && !previewUrl && !previewLoading) {
        fetchPreview();
      }
    }
  }, [fileId, fileInfoQuery.data, fileCache, fileInfo, previewUrl, previewLoading, fetchPreview]);
  
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
  
  // Utiliser les utilitaires du service de message pour la compatibilité
  const getFileType = useCallback((): string => {
    if (!fileInfo) return 'unknown';
    
    const { mime_type, extension } = fileInfo;
    
    if (mime_type?.startsWith('image/')) return 'image';
    if (mime_type?.startsWith('video/')) return 'video';
    if (mime_type?.startsWith('audio/')) return 'audio';
    if (mime_type === 'application/pdf') return 'pdf';
    if (mime_type?.includes('spreadsheet') || extension === 'xlsx' || extension === 'xls') return 'spreadsheet';
    if (mime_type?.includes('document') || extension === 'docx' || extension === 'doc') return 'document';
    if (mime_type?.includes('presentation') || extension === 'pptx' || extension === 'ppt') return 'presentation';
    if (mime_type?.includes('zip') || mime_type?.includes('archive')) return 'archive';
    
    return 'file';
  }, [fileInfo]);
  
  // ----------------
  // API exposée par le hook
  // ----------------
  return {
    // Données
    fileInfo,
    previewUrl,
    
    // États de chargement
    isInfoLoading: fileInfoQuery.isLoading,
    isPreviewLoading: previewLoading,
    isDownloading: downloadLoading,
    isLoading: fileInfoQuery.isLoading || previewLoading,
    
    // Actions
    fetchFileInfo: fileInfoQuery.refetch,
    fetchPreview,
    downloadFile,
    
    // URLs utilitaires (compatibles avec l'existant)
    getDownloadUrl: () => fileId ? `${apiClient.getBaseUrl()}/api/v4/files/${fileId}` : '',
    getPreviewUrl: () => fileId ? `${apiClient.getBaseUrl()}/api/v4/files/${fileId}/preview` : '',
    
    // Accès direct aux données
    fileId,
    fileName: fileInfo?.name || '',
    fileMimeType: fileInfo?.mime_type || '',
    fileExtension: fileInfo?.extension || '',
    fileSize: fileInfo?.size || 0,
    fileCreator: fileInfo?.user_id || '',
    fileCreatedAt: fileInfo?.create_at || 0,
    
    // Utilitaires
    getFileType,
    formatFileSize: (size = fileInfo?.size) => {
      if (!size) return '0 B';
      return messageService.formatFileSize(size);
    },
    
    // Méthodes de détection de type
    isImage: () => fileInfo?.mime_type?.startsWith('image/') || false,
    isVideo: () => fileInfo?.mime_type?.startsWith('video/') || false,
    isAudio: () => fileInfo?.mime_type?.startsWith('audio/') || false,
    isPdf: () => fileInfo?.mime_type === 'application/pdf' || false,
    isText: () => fileInfo?.mime_type?.startsWith('text/') || false,
    isSpreadsheet: () => fileInfo?.mime_type?.includes('spreadsheet') || 
                        fileInfo?.extension === 'xlsx' || 
                        fileInfo?.extension === 'xls' || 
                        false,
    isDocument: () => fileInfo?.mime_type?.includes('document') || 
                      fileInfo?.extension === 'docx' || 
                      fileInfo?.extension === 'doc' || 
                      false,
    isViewable: () => {
      if (!fileInfo?.mime_type) return false;
      return fileInfo.mime_type.startsWith('image/') || 
            fileInfo.mime_type === 'application/pdf' ||
            fileInfo.mime_type.startsWith('text/');
    }
  };
}