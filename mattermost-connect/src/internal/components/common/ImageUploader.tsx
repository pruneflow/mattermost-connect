import { UploadFile as UploadFileIcon } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

// Image upload component
const ImageUploader: React.FC<{
  onDataChange?: (data: { file: File | null }) => void;
}> = ({ onDataChange }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Update parent data when file changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({ file });
    }
  }, [file, onDataChange]);

  // Generate image preview
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Clean up object URL on unmount
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];

      // Check if the file is actually an image
      if (!selectedFile.type.startsWith("image/")) {
        // Show an error if it's not an image
        alert("Please select an image file");
        return;
      }

      setFile(selectedFile);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Button
        variant="outlined"
        component="label"
        startIcon={<UploadFileIcon />}
      >
        Select Image
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileChange}
        />
      </Button>

      {preview && (
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="subtitle2" gutterBottom>
            Preview:
          </Typography>
          <Box
            component="img"
            src={preview}
            alt="Preview"
            sx={{
              maxWidth: "100%",
              maxHeight: 200,
              objectFit: "contain",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default ImageUploader;
