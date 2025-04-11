// src/components/Example/FileDownloader.tsx
import React, { useState } from "react";
import { useMattermost } from "../../context/MattermostProvider";
import { Box, Button, CircularProgress, Typography } from "@mui/material";

/**
 * Example component using the centralized services
 */
const FileDownloader: React.FC<{ fileId: string }> = ({ fileId }) => {
  const { fileService } = useMattermost();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      // Using the fileService from context
      await fileService.downloadFile(fileId);
    } catch (err) {
      console.error("Download error:", err);
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button
        variant="contained"
        onClick={handleDownload}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={16} /> : null}
      >
        {loading ? "Downloading..." : "Download File"}
      </Button>

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default FileDownloader;
