import { Close as CloseIcon } from "@mui/icons-material";
import { IconButton } from "@mui/material";

interface AttachmentPreviewControlsProps {
  /** Mode de l'attachement */
  isPreviewMode: boolean;
  /** Fonction pour supprimer l'attachement */
  onRemove?: () => void;
  /** Si l'upload est en cours */
  isUploading?: boolean;
}

const AttachmentPreviewControls: React.FC<AttachmentPreviewControlsProps> = ({
  isPreviewMode,
  onRemove,
  isUploading,
}) => {
  if (!isPreviewMode || !onRemove || isUploading) return null;

  return (
    <IconButton
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      sx={{
        position: "absolute",
        top: -8,
        right: -8,
        bgcolor: "background.paper",
        boxShadow: 1,
        "&:hover": {
          bgcolor: "error.light",
          color: "error.contrastText",
        },
      }}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  );
};

export default AttachmentPreviewControls;
