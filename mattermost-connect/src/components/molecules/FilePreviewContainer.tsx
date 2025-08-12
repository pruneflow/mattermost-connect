import React, { useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { FileItem, FileStatus } from './FileItem';
import { client } from '../../api/client';

export interface FilePreviewContainerProps {
  files: FileStatus[];
  channelId: string;
  onRemove: (file: File) => void;
  onFilesChange?: (files: FileStatus[]) => void;
}

/**
 * Conteneur pour la prévisualisation et gestion des fichiers
 * dans l'input de composition de message
 */
export const FilePreviewContainer: React.FC<FilePreviewContainerProps> = ({
  files,
  channelId,
  onRemove,
  onFilesChange,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<Set<File>>(new Set());

  // Fonction d'upload vers Mattermost
  const uploadToMattermost = useCallback(async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append("channel_id", channelId)

      const response = await client.uploadFile(formData);

      if (response.file_infos && response.file_infos.length > 0) {
        return response.file_infos[0].id;
      }
      
      throw new Error('Upload failed: no file info returned');
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }, [channelId]);

  const handleRemoveFile = useCallback((file: File) => {
    onRemove(file);
  }, [onRemove]);

  const markFileAsUploading = useCallback((file: File) => {
    setUploadingFiles(prev => new Set(prev).add(file));
  }, []);

  const removeFromUploading = useCallback((file: File) => {
    setUploadingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(file);
      return newSet;
    });
  }, []);

  // Auto-upload des nouveaux fichiers
  useEffect(() => {
    const newFiles = files.filter(
      f => !f.uploaded && !f.uploading && !uploadingFiles.has(f.file) && !f.error
    );

    if (newFiles.length > 0) {
      newFiles.forEach(async (fileStatus) => {
        const { file } = fileStatus;
        
        markFileAsUploading(file);
        fileStatus.uploading = true;
        onFilesChange?.(files);
        
        try {
          const fileId = await uploadToMattermost(file);
          
          fileStatus.uploaded = true;
          fileStatus.uploading = false;
          fileStatus.fileId = fileId;
          fileStatus.error = undefined;
          
        } catch (error) {
          fileStatus.error = error instanceof Error ? error.message : 'Upload failed';
          fileStatus.uploading = false;
          fileStatus.uploaded = false;
        } finally {
          removeFromUploading(file);
          onFilesChange?.(files);
        }
      });
    }
  }, [files, uploadToMattermost, uploadingFiles, onFilesChange, markFileAsUploading, removeFromUploading]);

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <Box
      className="file-preview__container"
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 1,
        p: 1,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      {files.map((fileStatus, index) => {
        const handleRemove = () => handleRemoveFile(fileStatus.file)
        return (
        <FileItem
          key={`${fileStatus.file.name}-${fileStatus.file.lastModified}-${index}`}
          file={fileStatus}
          showRemove={true}
          uploading={fileStatus.uploading || uploadingFiles.has(fileStatus.file)}
          onRemove={handleRemove}
        />
      )})}
    </Box>
  );
};

export default FilePreviewContainer;