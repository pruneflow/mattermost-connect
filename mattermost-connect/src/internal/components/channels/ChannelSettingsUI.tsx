// src/internal/components/channels/ChannelSettingsUI.tsx
/**
 * UI component for channel settings
 * Handles display and editing of channel settings
 */
import React from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  FormGroup,
  FormControlLabel,
  Switch,
  InputAdornment,
  Grid,
  Alert,
  IconButton,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as ResetIcon,
} from "@mui/icons-material";
import { Channel } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";

export interface ChannelSettingsUIProps extends BaseComponentProps {
  /** Form data for the channel */
  formData: {
    display_name: string;
    name: string;
    header: string;
    purpose: string;
  };
  /** Validation errors */
  errors: Record<string, string>;
  /** Whether data is being loaded */
  isLoading?: boolean;
  /** Whether form is valid */
  isValid?: boolean;
  /** Whether form has unsaved changes */
  isDirty?: boolean;
  /** Whether in edit mode */
  editMode?: boolean;
  /** Editable fields */
  editableFields?: Array<"display_name" | "name" | "header" | "purpose">;
  /** Whether channel is direct or group message */
  isDirectOrGroup?: boolean;
  /** Callback when field changes */
  onFieldChange: (
    field: "display_name" | "name" | "header" | "purpose",
    value: string,
  ) => void;
  /** Callback when form is submitted */
  onSubmit: () => void;
  /** Callback when edit is cancelled */
  onCancel: () => void;
}

/**
 * UI component for displaying and editing channel settings
 */
const ChannelSettingsUI: React.FC<ChannelSettingsUIProps> = ({
  formData,
  errors,
  isLoading = false,
  isValid = true,
  isDirty = false,
  editMode = false,
  editableFields = ["display_name", "name", "header", "purpose"],
  isDirectOrGroup = false,
  onFieldChange,
  onSubmit,
  onCancel,
  className,
  sx,
  id,
}) => {
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && isValid) {
      onSubmit();
    }
  };

  // Helper to check if a field is editable
  const isFieldEditable = (field: string) => {
    return editableFields.includes(field as any) && editMode;
  };

  // Get error message for field
  const getErrorMessage = (field: string) => {
    return errors[field] || "";
  };

  // Helper to check if a field has an error
  const hasError = (field: string) => {
    return Boolean(errors[field]);
  };

  return (
    <Paper
      className={className}
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: "100%",
        ...sx,
      }}
      id={id}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">Channel Settings</Typography>
        <Box>
          {editMode ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                type="submit"
                disabled={isLoading || !isValid || !isDirty}
                sx={{ mr: 1 }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() =>
                onFieldChange("display_name", formData.display_name)
              } // Trigger edit mode
              disabled={isLoading}
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Form content */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={3}>
          {/* Channel Name */}
          {!isDirectOrGroup && (
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Channel Name"
                name="display_name"
                value={formData.display_name}
                onChange={(e) => onFieldChange("display_name", e.target.value)}
                disabled={!isFieldEditable("display_name") || isLoading}
                error={hasError("display_name")}
                helperText={getErrorMessage("display_name")}
                required={isFieldEditable("display_name")}
                margin="normal"
              />
            </Grid>
          )}

          {/* Channel URL */}
          {!isDirectOrGroup && (
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Channel URL"
                name="name"
                value={formData.name}
                onChange={(e) => onFieldChange("name", e.target.value)}
                disabled={!isFieldEditable("name") || isLoading}
                error={hasError("name")}
                helperText={
                  getErrorMessage("name") ||
                  "The URL-friendly name for the channel. Lower case letters, numbers, and hyphens only."
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">@</InputAdornment>
                  ),
                }}
                margin="normal"
              />
            </Grid>
          )}

          {/* Purpose */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Purpose"
              name="purpose"
              value={formData.purpose}
              onChange={(e) => onFieldChange("purpose", e.target.value)}
              disabled={!isFieldEditable("purpose") || isLoading}
              error={hasError("purpose")}
              helperText={
                getErrorMessage("purpose") ||
                `${formData.purpose?.length || 0}/250 - A short description of the channel's purpose.`
              }
              margin="normal"
              multiline
              maxRows={2}
            />
          </Grid>

          {/* Header */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Header"
              name="header"
              value={formData.header}
              onChange={(e) => onFieldChange("header", e.target.value)}
              disabled={!isFieldEditable("header") || isLoading}
              error={hasError("header")}
              helperText={
                getErrorMessage("header") ||
                `${formData.header?.length || 0}/1024 - Additional information displayed at the top of the channel.`
              }
              margin="normal"
              multiline
              rows={3}
            />
          </Grid>
        </Grid>

        {/* Form-level error */}
        {errors._general && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errors._general}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default ChannelSettingsUI;
