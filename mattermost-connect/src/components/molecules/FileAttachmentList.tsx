import React, { useCallback, useState } from "react";
import { Box } from "@mui/material";
import { FileItem } from "./FileItem";
import { FilePreviewModal } from "./FilePreviewModal";
import { fetchAllFiles } from "../../services/fileService";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectMultipleFileInfos } from "../../store/selectors/filesSelectors";

export interface FileAttachmentListProps {
  postId: string;
  fileIds: string[];
}

/**
 * Composant pour l'affichage des pièces jointes dans les messages
 * Gère la prévisualisation, le téléchargement et la copie de lien
 */
export const FileAttachmentList: React.FC<FileAttachmentListProps> = ({
  postId,
  fileIds,
}) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);

  // Get file infos from Redux store
  const fileInfos = useAppSelector((state) =>
    selectMultipleFileInfos(state, fileIds),
  );

  // Chargement des fichiers
  React.useEffect(() => {
    if (fileIds.length > 0) {
      fetchAllFiles(postId, fileIds);
    }
  }, [postId, fileIds]);

  const handleFilePreview = useCallback((clickedIndex: number) => {
    setPreviewStartIndex(clickedIndex);
    setPreviewModalOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewModalOpen(false);
  }, []);

  // Filter out null file infos and only show files that loaded
  const validFiles = fileInfos.filter(
    (file): file is NonNullable<typeof file> => Boolean(file),
  );

  if (validFiles.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 1 }}>
      {/* File attachments */}
      <Box
        className="post-image__columns"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          flexWrap: "wrap",
          gap: 1,
          width: "100%",
        }}
      >
        {validFiles.map((file, index) => {
          const onPreview = () => handleFilePreview(index);
          return (
            <FileItem
              key={file.id}
              file={file}
              showPreview={true}
              showDownload={true}
              showPublicLink={true}
              onPreview={onPreview}
            />
          );
        })}
      </Box>

      {/* File Preview Modal */}
      {previewModalOpen && (
        <FilePreviewModal
          fileIds={fileIds}
          startIndex={previewStartIndex}
          open={previewModalOpen}
          onClose={handleClosePreview}
          postId={postId}
        />
      )}
    </Box>
  );
};

export default FileAttachmentList;
