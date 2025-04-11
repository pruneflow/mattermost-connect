// src/components/Attachment/attachments/DocumentAttachment.tsx
import React from "react";
import { alpha, Box } from "@mui/material";
import { DocumentAttachmentProps } from "../types/AttachmentTypes";
import {
  PictureAsPdf as PdfIcon,
  Description as TextIcon,
  Code as CodeIcon,
  FolderZip as ZipIcon,
  InsertDriveFile as FileIcon,
} from "@mui/icons-material";

/**
 * Component for displaying document attachments (PDF, text, code, etc.)
 */
const DocumentAttachment: React.FC<DocumentAttachmentProps> = ({
  fileType,
  fileName,
  onDocumentClick,
  iconSx,
  sx,
}) => {
  // Get appropriate icon based on file type
  const getFileIcon = () => {
    if (fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
      return <PdfIcon sx={iconSx} />;
    } else if (fileName.match(/\.(txt|md|rtf|doc|docx)$/i)) {
      return <TextIcon sx={iconSx} />;
    } else if (
      fileName.match(/\.(js|jsx|ts|tsx|html|css|java|py|c|cpp|php|rb)$/i)
    ) {
      return <CodeIcon sx={iconSx} />;
    } else if (fileName.match(/\.(zip|rar|7z|tar|gz)$/i)) {
      return <ZipIcon sx={iconSx} />;
    } else {
      return <FileIcon sx={iconSx} />;
    }
  };

  return (
    <Box
      sx={{
        mr: 1.5,
        color: "primary.main",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
        cursor: onDocumentClick ? "pointer" : "default",
        ...sx,
      }}
      onClick={onDocumentClick}
    >
      {getFileIcon()}
    </Box>
  );
};

export default DocumentAttachment;
