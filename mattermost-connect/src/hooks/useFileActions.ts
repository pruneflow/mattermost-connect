import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { 
  downloadFile, 
  generatePublicLink,
  type FileInfo 
} from '../store/slices/filesSlice';
import {
  selectFileInfoById,
  selectIsFileDownloadingById,
  selectFilePublicLinkById
} from '../store/selectors/filesSelectors';

/**
 * Hook pour les actions sur un fichier spécifique
 * Basé sur l'implémentation officielle Mattermost avec Redux
 */
export function useFileActions(fileId: string) {
  const dispatch = useAppDispatch();
  
  // Sélecteurs
  const fileInfo = useAppSelector(state => selectFileInfoById(state, fileId));
  const isDownloading = useAppSelector(state => selectIsFileDownloadingById(state, fileId));
  const publicLink = useAppSelector(state => selectFilePublicLinkById(state, fileId));

  // Actions
  const handleDownload = useCallback(async (fileName?: string) => {
    if (!fileInfo) return false;
    
    try {
      await dispatch(downloadFile({ fileId, fileName: fileName || fileInfo.name })).unwrap();
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      return false;
    }
  }, [dispatch, fileId, fileInfo]);

  const handleGeneratePublicLink = useCallback(async () => {
    if (publicLink) {
      // Si on a déjà le lien, le retourner directement
      return publicLink;
    }
    
    try {
      const result = await dispatch(generatePublicLink({ fileId })).unwrap();
      return result.publicLink;
    } catch (error) {
      console.error('Failed to generate public link:', error);
      return null;
    }
  }, [dispatch, fileId, publicLink]);

  const copyPublicLinkToClipboard = useCallback(async () => {
    try {
      const link = await handleGeneratePublicLink();
      if (link) {
        await navigator.clipboard.writeText(link);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to copy public link:', error);
      return false;
    }
  }, [handleGeneratePublicLink]);

  return {
    // État
    fileInfo,
    isDownloading,
    publicLink,
    
    // Actions
    download: handleDownload,
    generatePublicLink: handleGeneratePublicLink,
    copyPublicLinkToClipboard,
    
    // Utilitaires
    canDownload: Boolean(fileInfo),
    hasPublicLink: Boolean(publicLink),
  };
}