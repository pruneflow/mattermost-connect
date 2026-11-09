import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { FileState } from '../slices/filesSlice';
import { FileInfo } from '../../api/types'
// ================================================================================
// BASE SELECTORS
// ================================================================================

export const selectFilesState = (state: RootState) => state.files;

export const selectAllFiles = createSelector(
  [selectFilesState],
  (filesState) => filesState.files
);

export const selectFileState = createSelector(
  [selectAllFiles, (_: RootState, fileId: string) => fileId],
  (files, fileId): FileState | null => files[fileId] || null
);

// ================================================================================
// FILE INFO SELECTORS
// ================================================================================

export const selectFileInfo = createSelector(
  [selectFileState],
  (fileState): FileInfo | null => fileState?.info || null
);

export const selectFileInfoLoadingState = createSelector(
  [selectFileState],
  (fileState) => fileState?.infoLoadingState || 'idle'
);

export const selectIsFileInfoLoading = createSelector(
  [selectFileInfoLoadingState],
  (loadingState) => loadingState === 'loading'
);

// ================================================================================
// PREVIEW SELECTORS
// ================================================================================

export const selectFilePreviewUrl = createSelector(
  [selectFileState],
  (fileState): string | null => fileState?.previewUrl || null
);

export const selectFilePreviewLoadingState = createSelector(
  [selectFileState],
  (fileState) => fileState?.previewLoadingState || 'idle'
);

export const selectIsFilePreviewLoading = createSelector(
  [selectFilePreviewLoadingState],
  (loadingState) => loadingState === 'loading'
);

// ================================================================================
// DOWNLOAD SELECTORS
// ================================================================================

export const selectFileDownloadLoadingState = createSelector(
  [selectFileState],
  (fileState) => fileState?.downloadLoadingState || 'idle'
);

export const selectIsFileDownloading = createSelector(
  [selectFileDownloadLoadingState],
  (loadingState) => loadingState === 'loading'
);

// ================================================================================
// COMBINED SELECTORS
// ================================================================================

export const selectIsFileLoading = createSelector(
  [selectIsFileInfoLoading, selectIsFilePreviewLoading, selectIsFileDownloading],
  (isInfoLoading, isPreviewLoading, isDownloading) => 
    isInfoLoading || isPreviewLoading || isDownloading
);

export const selectFileError = createSelector(
  [selectFileState],
  (fileState): string | null => fileState?.error || null
);

// ================================================================================
// UTILITY SELECTORS
// ================================================================================

export const selectFileType = createSelector(
  [selectFileInfo],
  (fileInfo): string => {
    if (!fileInfo) return 'unknown';

    const { mime_type, extension } = fileInfo;

    if (mime_type?.startsWith('image/')) return 'image';
    if (mime_type?.startsWith('video/')) return 'video';
    if (mime_type?.startsWith('audio/')) return 'audio';
    if (mime_type === 'application/pdf') return 'pdf';
    if (
      mime_type?.includes('spreadsheet') ||
      extension === 'xlsx' ||
      extension === 'xls'
    )
      return 'spreadsheet';
    if (
      mime_type?.includes('document') ||
      extension === 'docx' ||
      extension === 'doc'
    )
      return 'document';

    return 'file';
  }
);

export const selectIsFileImage = createSelector(
  [selectFileInfo],
  (fileInfo): boolean => fileInfo?.mime_type?.startsWith('image/') || false
);

export const selectIsFileVideo = createSelector(
  [selectFileInfo],
  (fileInfo): boolean => fileInfo?.mime_type?.startsWith('video/') || false
);

export const selectIsFileAudio = createSelector(
  [selectFileInfo],
  (fileInfo): boolean => fileInfo?.mime_type?.startsWith('audio/') || false
);

export const selectIsFilePdf = createSelector(
  [selectFileInfo],
  (fileInfo): boolean => fileInfo?.mime_type === 'application/pdf' || false
);

export const selectIsFileText = createSelector(
  [selectFileInfo],
  (fileInfo): boolean => fileInfo?.mime_type?.startsWith('text/') || false
);

export const selectIsFileViewable = createSelector(
  [selectFileInfo],
  (fileInfo): boolean => {
    if (!fileInfo?.mime_type) return false;
    return (
      fileInfo.mime_type.startsWith('image/') ||
      fileInfo.mime_type === 'application/pdf' ||
      fileInfo.mime_type.startsWith('text/')
    );
  }
);

// ================================================================================
// MULTIPLE FILES SELECTORS
// ================================================================================

export const selectMultipleFileInfos = createSelector(
  [selectAllFiles, (_: RootState, fileIds: string[]) => fileIds],
  (files, fileIds): (FileInfo | null)[] => {
    // Single-pass processing to avoid creating intermediate arrays
    const result: (FileInfo | null)[] = [];
    for (const fileId of fileIds) {
      result.push(files[fileId]?.info || null);
    }
    return result;
  }
);

export const selectMultipleFileStates = createSelector(
  [selectAllFiles, (_: RootState, fileIds: string[]) => fileIds],
  (files, fileIds): (FileState | null)[] => {
    // Single-pass processing to avoid creating intermediate arrays
    const result: (FileState | null)[] = [];
    for (const fileId of fileIds) {
      result.push(files[fileId] || null);
    }
    return result;
  }
);

// ================================================================================
// CONVENIENT BY-ID SELECTORS (for direct fileId access)
// ================================================================================

export const selectFileInfoById = (state: RootState, fileId: string): FileInfo | null =>
  selectFileInfo(state, fileId);

export const selectFilePreviewUrlById = (state: RootState, fileId: string): string | null =>
  selectFilePreviewUrl(state, fileId);

export const selectIsFilePreviewLoadingById = (state: RootState, fileId: string): boolean =>
  selectIsFilePreviewLoading(state, fileId);

export const selectIsFileDownloadingById = (state: RootState, fileId: string): boolean =>
  selectIsFileDownloading(state, fileId);

export const selectFilePublicLinkById = (state: RootState, fileId: string): string | null =>
  selectFileState(state, fileId)?.publicLink || null;