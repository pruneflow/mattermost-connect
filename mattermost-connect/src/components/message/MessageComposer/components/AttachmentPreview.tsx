import { Box } from "@mui/material";
import Attachment, { AttachmentMode } from "../../Attachment/Attachment";
import { FileUploadStatus } from "../MessageComposer";

interface AttachmentPreviewProps {
  /** Liste des statuts des fichiers joints */
  attachmentStatus: FileUploadStatus[];
  /** Fonction pour supprimer une pièce jointe */
  handleRemoveAttachment: (file: File) => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachmentStatus,
  handleRemoveAttachment,
}) => {
  if (attachmentStatus.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        mb: 1,
      }}
    >
      {attachmentStatus.map((status, index) => (
        <Attachment
          key={index}
          file={
            status.uploaded && status.mattermostFile
              ? status.mattermostFile
              : status.file
          }
          onRemove={() => handleRemoveAttachment(status.file)}
          isUploading={status.uploading}
          isUploaded={status.uploaded}
          mode={AttachmentMode.PREVIEW}
        />
      ))}
    </Box>
  );
};
