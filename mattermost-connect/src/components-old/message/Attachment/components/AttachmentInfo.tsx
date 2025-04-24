import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

interface AttachmentInfoProps {
  /** Nom du fichier */
  fileName: string;
  /** Taille du fichier formatée */
  formattedSize: string;
  /** Si l'upload est en cours */
  isUploading?: boolean;
}

const AttachmentInfo: React.FC<AttachmentInfoProps> = ({
  fileName,
  formattedSize,
  isUploading,
}) => {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="body2"
        component={"div"}
        noWrap
        title={fileName}
        fontWeight={500}
      >
        {fileName}
      </Typography>

      <Typography variant="caption" component={"div"} color="text.secondary">
        {formattedSize}
        {isUploading && (
          <Box
            component="span"
            sx={{ ml: 1, display: "inline-flex", alignItems: "center" }}
          >
            <CircularProgress size={10} sx={{ mr: 0.5 }} />
            Uploading...
          </Box>
        )}
      </Typography>
    </Box>
  );
};

export default AttachmentInfo;
