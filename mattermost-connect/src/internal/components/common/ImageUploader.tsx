import { UploadFile as UploadFileIcon } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

// Composant d'upload d'image
const ImageUploader: React.FC<{
  onDataChange?: (data: { file: File | null }) => void;
}> = ({ onDataChange }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Mettre à jour les données du parent quand le fichier change
  useEffect(() => {
    if (onDataChange) {
      onDataChange({ file });
    }
  }, [file, onDataChange]);

  // Générer la prévisualisation de l'image
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Nettoyer l'URL de l'objet lors du démontage
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];

      // Vérifier si le fichier est bien une image
      if (!selectedFile.type.startsWith("image/")) {
        // Afficher une erreur si ce n'est pas une image
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
