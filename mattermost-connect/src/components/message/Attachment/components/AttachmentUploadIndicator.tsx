import { CircularProgress } from "@mui/material";

interface AttachmentUploadIndicatorProps {
  /** Mode de l'attachement */
  isPreviewMode: boolean;
  /** Si l'upload est en cours */
  isUploading?: boolean;
}

const AttachmentUploadIndicator: React.FC<AttachmentUploadIndicatorProps> = ({
  isPreviewMode,
  isUploading,
}) => {
  if (!isPreviewMode || !isUploading) return null;

  return (
    <CircularProgress
      size={24}
      sx={{
        position: "absolute",
        top: -12,
        right: -12,
        bgcolor: "background.paper",
        borderRadius: "50%",
        p: 0.5,
      }}
    />
  );
};

export default AttachmentUploadIndicator;
