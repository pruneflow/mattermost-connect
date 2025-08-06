import React from 'react';
import { Box, SxProps, Theme } from "@mui/material";
import {
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
} from '@mui/icons-material';
import { client } from '../../api/client';

export interface FileIconProps {
  mimeType: string;
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps<Theme>;
}

/**
 * Component that displays appropriate icon based on file MIME type
 * Uses Mattermost-style file type detection and iconography
 */
export const FileTypeIcon: React.FC<FileIconProps> = ({
  mimeType,
  size = 'medium',
  sx = {},
}) => {
  const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
  const fontSize = size === 'small' ? 'small' : size === 'medium' ? 'medium' : 'large';

  const getFileIcon = () => {
    const baseUrl = client.getUrl();

    if (mimeType.startsWith('image/')) {
      return <ImageIcon fontSize={fontSize} />;
    } else if (mimeType === 'application/pdf') {
      return (
        <Box
          component="img"
          src={`${baseUrl}/static/files/00301d72e07c55d59df5.svg`}
          alt="PDF file"
          sx={{ width: iconSize, height: iconSize }}
        />
      );
    } else if (
      mimeType.startsWith('text/') ||
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('xml') ||
      mimeType.includes('html') ||
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation') ||
      mimeType.includes('ms-') ||
      mimeType.includes('office') ||
      mimeType.includes('archive') ||
      mimeType.includes('zip') ||
      mimeType.includes('rar')
    ) {
      return (
        <Box
          component="img"
          src={`${baseUrl}/static/files/48c8ed225ff4a2f7a4c1.svg`}
          alt="Document file"
          sx={{ width: iconSize, height: iconSize }}
        />
      );
    } else if (mimeType.startsWith('video/')) {
      return <VideoIcon fontSize={fontSize} />;
    } else if (mimeType.startsWith('audio/')) {
      return <AudioIcon fontSize={fontSize} />;
    } else {
      return <FileIcon fontSize={fontSize} />;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...sx,
      }}
    >
      {getFileIcon()}
    </Box>
  );
};

export default FileTypeIcon;