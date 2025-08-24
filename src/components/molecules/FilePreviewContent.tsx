/**
 * File preview modal content component
 * Handles rendering of different file types (images, PDFs, audio/video)
 */
import React from "react";
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
} from "@mui/icons-material";
import { FileDownloadButton } from "./FileDownloadButton";
import { formatFileSize } from "../../utils/formatters";
import { ImagePreview } from "./ImagePreview";
import { PDFPreview } from "./PDFPreview";
import { AudioVideoPreview } from "./AudioVideoPreview";
import { FileInfo } from "../../api/types";

interface FilePreviewContentProps {
  fileInfo: FileInfo;
  currentFileId: string | null;
  showNavigation: boolean;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  onNavigatePrevious: (event: React.MouseEvent) => void;
  onNavigateNext: (event: React.MouseEvent) => void;
  onBackdropClick: () => void;
}

export const FilePreviewContent: React.FC<FilePreviewContentProps> = ({
  fileInfo,
  currentFileId,
  showNavigation,
  canNavigatePrevious,
  canNavigateNext,
  onNavigatePrevious,
  onNavigateNext,
  onBackdropClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const renderFilePreview = () => {
    if (!fileInfo || !currentFileId) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <CircularProgress size={48} />
        </Box>
      );
    }

    const { mime_type, name } = fileInfo;

    // Image preview
    if (mime_type.startsWith("image/")) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
            overflow: "hidden",
            p: 2,
          }}
        >
          <ImagePreview
            fileId={currentFileId}
            alt={name}
            updateAt={fileInfo.update_at}
            onContentClick={(e) => e.stopPropagation()}
          />
        </Box>
      );
    }

    // Audio/Video preview
    if (mime_type.startsWith("video/") || mime_type.startsWith("audio/")) {
      return (
        <AudioVideoPreview
          fileId={currentFileId}
          fileName={name}
          fileSize={fileInfo.size}
          mimeType={mime_type}
          updateAt={fileInfo.update_at}
          onContentClick={(e) => e.stopPropagation()}
        />
      );
    }

    // PDF preview
    if (mime_type === "application/pdf") {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
            p: 2,
          }}
        >
          <PDFPreview
            fileId={currentFileId}
            fileName={name}
            fileSize={fileInfo.size}
            updateAt={fileInfo.update_at}
            onContentClick={(e) => e.stopPropagation()}
          />
        </Box>
      );
    }

    // Fallback for unsupported file types
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
          p: 4,
        }}
      >
        <Box
          sx={{
            backgroundColor: "white",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            maxWidth: 400,
            width: "100%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              color: "text.primary",
              mb: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {name}
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>
            Preview not available for this file type
          </Typography>
          <Typography variant="body2" sx={{ color: "text.disabled", mb: 3 }}>
            File size:{" "}
            {fileInfo.size ? formatFileSize(fileInfo.size) : "Unknown"}
          </Typography>
          <FileDownloadButton fileId={currentFileId} size="large" />
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        p: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "transparent",
        height: isMobile ? "calc(100dvh - 120px - 80px)" : "90dvh", // Mobile: minus header and footer heights
        flex: 1,
        cursor: "pointer",
        width: "100%", // Fix horizontal scroll issue
      }}
      onClick={onBackdropClick}
    >
      {renderFilePreview()}

      {/* Desktop navigation overlay */}
      {!isMobile && showNavigation && (
        <>
          {canNavigatePrevious && (
            <IconButton
              onClick={onNavigatePrevious}
              sx={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "text.primary",
                backdropFilter: "blur(8px)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 1)",
                },
                zIndex: 10,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
              }}
            >
              <PrevIcon />
            </IconButton>
          )}

          {canNavigateNext && (
            <IconButton
              onClick={onNavigateNext}
              sx={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "text.primary",
                backdropFilter: "blur(8px)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 1)",
                },
                zIndex: 10,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
              }}
            >
              <NextIcon />
            </IconButton>
          )}
        </>
      )}
    </Box>
  );
};
