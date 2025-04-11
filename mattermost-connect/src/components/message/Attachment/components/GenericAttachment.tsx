// src/components/Attachment/attachments/GenericAttachment.tsx
import React from "react";
import { alpha, Box } from "@mui/material";
import { BaseAttachmentProps } from "../types/AttachmentTypes";
import { InsertDriveFile as FileIcon } from "@mui/icons-material";

/**
 * Props for generic attachments
 */
interface GenericAttachmentProps extends BaseAttachmentProps {
  /** File type/mime-type */
  fileType: string;

  /** File name */
  fileName: string;

  /** Custom handling for attachment click */
  onAttachmentClick?: () => void;
}

/**
 * Component for displaying generic file attachments
 */
const GenericAttachment: React.FC<GenericAttachmentProps> = ({
  onAttachmentClick,
  iconSx,
  sx,
}) => {
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
        cursor: onAttachmentClick ? "pointer" : "default",
        ...sx,
      }}
      onClick={onAttachmentClick}
    >
      <FileIcon sx={iconSx} />
    </Box>
  );
};

export default GenericAttachment;
