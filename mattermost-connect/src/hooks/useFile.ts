import { useCallback, useMemo } from 'react';
import { useAppSelector } from './useAppSelector';
import { createSelector } from '@reduxjs/toolkit';
import { client } from '../api/client';
import { formatFileSize } from '../utils/formatters';
import {
  fetchFileInfosForPost,
  fetchFilePreview,
  downloadFile,
  clearPreviewUrl,
  resetFileState,
  type FileInfo,
} from '../store/slices/filesSlice';
import {
  selectMultipleFileInfos,
} from '../store/selectors/filesSelectors';
import { useAppDispatch } from "./useAppDispatch";

// Empty array references
const EMPTY_FILE_INFOS = Object.freeze([]) as readonly FileInfo[];
const EMPTY_FILE_IDS = Object.freeze([]) as readonly string[];

/**
 * Hook unifié pour la gestion des fichiers avec Redux au niveau post
 * Source unique de vérité pour toutes les opérations sur les fichiers d'un post
 * Inclut mise en cache, prévisualisation et opérations communes via Redux
 *
 * @param postId Identifiant du post dont on veut gérer les fichiers
 * @returns Interface unifiée pour toutes les opérations sur les fichiers du post
 */
export function useFile(postId: string | undefined) {
  const dispatch = useAppDispatch();

  // Récupérer les métadonnées du post (contient les fileIds)
  const postFiles = useAppSelector((state) => 
    postId ? state.files.postFiles[postId] : null
  );
  
  // Récupérer les infos de tous les fichiers du post
  const fileInfos = useAppSelector((state) => 
    postFiles ? selectMultipleFileInfos(state, postFiles.fileIds) : EMPTY_FILE_INFOS
  );

  // ----------------
  // Actions Redux - Niveau Post
  // ----------------

  const fetchAllFiles = useCallback(
    async (fileIds: string[], force = false): Promise<void> => {
      if (!postId || !fileIds || fileIds.length === 0) return;
      
      try {
        await dispatch(fetchFileInfosForPost({ postId, fileIds, force })).unwrap();
      } catch (error) {
        console.error('Error fetching file infos for post:', error);
      }
    },
    [dispatch, postId]
  );

  const fetchAllPreviews = useCallback(
    async (force = false): Promise<void> => {
      if (!postId || !fileInfos || fileInfos.length === 0) return;
      
      try {
        // Charger les previews pour les images (les infos sont déjà là)
        const validFileInfos = fileInfos.filter((info): info is FileInfo => Boolean(info));
        const imageFiles = validFileInfos.filter(file => 
          file.mime_type?.startsWith('image/') && 
          !file.mime_type.includes('svg') && 
          !file.mime_type.includes('icon') &&
          !file.mime_type.includes('webp')
        );
        
        await Promise.all(
          imageFiles.map(file => 
            dispatch(fetchFilePreview({ fileId: file.id, force }))
          )
        );
      } catch (error) {
        console.error('Error fetching previews for post:', error);
      }
    },
    [dispatch, postId, fileInfos]
  );

  const downloadFileAction = useCallback(
    async (fileId: string, fileName?: string): Promise<boolean> => {
      if (!fileId) return false;
      
      try {
        await dispatch(downloadFile({ fileId, fileName })).unwrap();
        return true;
      } catch (error) {
        console.error('Error downloading file:', error);
        return false;
      }
    },
    [dispatch]
  );

  const clearPreview = useCallback((fileId: string) => {
    if (fileId) {
      dispatch(clearPreviewUrl(fileId));
    }
  }, [dispatch]);

  const resetFileStateAction = useCallback((fileId: string) => {
    if (fileId) {
      dispatch(resetFileState(fileId));
    }
  }, [dispatch]);

  // ----------------
  // URLs utilitaires
  // ----------------
  const getDownloadUrl = useCallback((fileId: string): string => {
    return fileId ? `${client.getUrl()}/api/v4/files/${fileId}` : '';
  }, []);

  const getPreviewUrlDirect = useCallback((fileId: string): string => {
    return fileId ? `${client.getUrl()}/api/v4/files/${fileId}/preview` : '';
  }, []);

  // ----------------
  // API exposée par le hook
  // ----------------
  return {
    // Données du post
    postId,
    fileInfos: fileInfos.filter((info): info is FileInfo => Boolean(info)), // Filter out nulls
    fileIds: postFiles?.fileIds || EMPTY_FILE_IDS,

    // Actions au niveau post
    fetchAllFiles,
    fetchAllPreviews,
    
    // Actions sur fichiers individuels
    downloadFile: downloadFileAction,
    clearPreview,
    resetFileState: resetFileStateAction,

    // URLs utilitaires
    getDownloadUrl,
    getPreviewUrl: getPreviewUrlDirect,

    // Utilitaires
    formatFileSize: (size: number) => formatFileSize(size),
  };
}