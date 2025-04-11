// src/components/Attachment/AttachmentGroup.tsx
import React from "react";

// Types
import { MessageAttachment as AttachmentType } from "../../../types";

// Material-UI Components
import {
  Box,
  useMediaQuery,
  useTheme,
  Grid,
  SxProps,
  Theme,
} from "@mui/material";
import Attachment, { AttachmentMode } from "./Attachment";

/**
 * Type for a group of attachments
 */
export interface AttachmentGroupProps {
  /** List of files to display */
  files: (File | AttachmentType)[];

  /** Display mode of the components */
  mode?: AttachmentMode;

  /** Handler to remove an attachment (PREVIEW mode) */
  onRemove?: (index: number) => void;

  /** Whether the files are currently uploading (PREVIEW mode) */
  isUploading?: boolean[];

  /** Whether the files have been uploaded to the server (PREVIEW mode) */
  isUploaded?: boolean[];

  /** Additional style */
  sx?: SxProps<Theme>;
}

/**
 * Component to display a group of attachments side by side (on desktop)
 */
export const AttachmentGroup: React.FC<AttachmentGroupProps> = ({
  files,
  mode = AttachmentMode.MESSAGE,
  onRemove,
  isUploading,
  isUploaded,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // If on mobile, stack the attachments
  if (isMobile) {
    return (
      <Box sx={sx}>
        {files.map((file, index) => (
          <Box key={index} sx={{ mb: 1, "&:last-child": { mb: 0 } }}>
            <Attachment
              file={file}
              mode={mode}
              onRemove={onRemove ? () => onRemove(index) : undefined}
              isUploading={isUploading ? isUploading[index] : undefined}
              isUploaded={isUploaded ? isUploaded[index] : undefined}
              width="100%"
            />
          </Box>
        ))}
      </Box>
    );
  }

  // On desktop and in message mode, display attachments inline with scroll
  if (mode === AttachmentMode.MESSAGE) {
    return (
      <Box
        sx={{
          display: "flex",
          overflowX: "auto",
          gap: 1,
          pb: 1, // Space for horizontal scroll
          ...sx,
        }}
      >
        {files.map((file, index) => (
          <Attachment
            key={index}
            file={file}
            mode={mode}
            width={240} // Fixed width for each attachment
          />
        ))}
      </Box>
    );
  }

  // On desktop for other modes (preview), display in grid
  return (
    <Grid container spacing={1} sx={sx}>
      {files.map((file, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
          <Attachment
            file={file}
            mode={mode}
            onRemove={onRemove ? () => onRemove(index) : undefined}
            isUploading={isUploading ? isUploading[index] : undefined}
            isUploaded={isUploaded ? isUploaded[index] : undefined}
            width="100%"
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default AttachmentGroup;
