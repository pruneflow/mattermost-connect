// src/internal/components/channels/ChannelCreateUI.tsx
/**
 * UI component for channel creation
 * Provides form for creating new channels
 */
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  Tooltip,
  Grid,
  Alert,
} from "@mui/material";
import {
  Tag as PublicIcon,
  LockOutlined as PrivateIcon,
  InfoOutlined as InfoIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { CreateChannelParams } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";

export interface ChannelCreateUIProps extends BaseComponentProps {
  /** Form data for the new channel */
  formData: Partial<CreateChannelParams>;
  /** Validation errors */
  errors: Record<string, string>;
  /** Whether data is being loaded/processed */
  isLoading?: boolean;
  /** Whether form is valid */
  isValid?: boolean;
  /** Function to generate channel URL from display name */
  nameGenerator?: (displayName: string) => string;
  /** Callback when field changes */
  onFieldChange: (field: string, value: any) => void;
  /** Callback when form is submitted */
  onSubmit: () => void;
  /** Callback when creation is cancelled */
  onCancel: () => void;
}

/**
 * UI component for creating new channels
 */
const ChannelCreateUI: React.FC<ChannelCreateUIProps> = ({
  formData,
  errors,
  isLoading = false,
  isValid = true,
  nameGenerator,
  onFieldChange,
  onSubmit,
  onCancel,
  className,
  sx,
  id,
}) => {
  // State for generated URL name
  const [showUrlField, setShowUrlField] = useState(false);

  // Get error message for field
  const getErrorMessage = (field: string) => {
    return errors[field] || "";
  };

  // Helper to check if a field has an error
  const hasError = (field: string) => {
    return Boolean(errors[field]);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && isValid) {
      onSubmit();
    }
  };

  // Handle display name change
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFieldChange("display_name", value);

    // Auto-generate URL name if not showing custom field
    if (!showUrlField && nameGenerator) {
      const generatedName = nameGenerator(value);
      onFieldChange("name", generatedName);
    }
  };

  // Toggle URL field visibility
  const handleToggleUrlField = () => {
    setShowUrlField(!showUrlField);
  };

  return (
    <Paper
      className={className}
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: "100%",
        maxWidth: 600,
        mx: "auto",
        ...sx,
      }}
      id={id}
    >
      {/* Header */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h5">Create a New Channel</Typography>
        <Typography variant="body2" color="textSecondary">
          Channels are where your team communicates. They're best organized
          around a topic.
        </Typography>
      </Box>

      <Divider />

      {/* Form content */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={3}>
          {/* Channel Name */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Channel Name"
              name="display_name"
              value={formData.display_name || ""}
              onChange={handleDisplayNameChange}
              disabled={isLoading}
              error={hasError("display_name")}
              helperText={
                getErrorMessage("display_name") ||
                "Enter a name for your channel."
              }
              required
              inputProps={{ maxLength: 64 }}
              margin="normal"
              autoFocus
            />
          </Grid>

          {/* Channel URL */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Channel URL
              </Typography>
              <Button
                size="small"
                onClick={handleToggleUrlField}
                sx={{ ml: 1 }}
              >
                {showUrlField ? "Use Generated URL" : "Customize URL"}
              </Button>
            </Box>

            {showUrlField ? (
              <TextField
                fullWidth
                name="name"
                value={formData.name || ""}
                onChange={(e) => onFieldChange("name", e.target.value)}
                disabled={isLoading}
                error={hasError("name")}
                helperText={
                  getErrorMessage("name") ||
                  "Use only lowercase letters, numbers, and hyphens."
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">@</InputAdornment>
                  ),
                }}
                margin="normal"
              />
            ) : (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body1"
                  component="span"
                  color="textSecondary"
                  sx={{ mr: 0.5 }}
                >
                  @
                </Typography>
                <Typography variant="body1">
                  {formData.name ||
                    (formData.display_name && nameGenerator
                      ? nameGenerator(formData.display_name)
                      : "channel-name")}
                </Typography>
              </Box>
            )}
          </Grid>

          {/* Channel Type */}
          <Grid size={{ xs: 12 }}>
            <FormControl component="fieldset" margin="normal">
              <FormLabel component="legend">Channel Type</FormLabel>
              <RadioGroup
                name="type"
                value={formData.type || "O"}
                onChange={(e) => onFieldChange("type", e.target.value)}
                row
              >
                <FormControlLabel
                  value="O"
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <PublicIcon sx={{ mr: 1 }} />
                      <Typography variant="body2">Public</Typography>
                      <Tooltip title="Anyone can join this channel">
                        <InfoIcon
                          fontSize="small"
                          sx={{ ml: 0.5, opacity: 0.7 }}
                        />
                      </Tooltip>
                    </Box>
                  }
                  disabled={isLoading}
                />
                <FormControlLabel
                  value="P"
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <PrivateIcon sx={{ mr: 1 }} />
                      <Typography variant="body2">Private</Typography>
                      <Tooltip title="Only invited members can join this channel">
                        <InfoIcon
                          fontSize="small"
                          sx={{ ml: 0.5, opacity: 0.7 }}
                        />
                      </Tooltip>
                    </Box>
                  }
                  disabled={isLoading}
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Purpose */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Purpose (Optional)"
              name="purpose"
              value={formData.purpose || ""}
              onChange={(e) => onFieldChange("purpose", e.target.value)}
              disabled={isLoading}
              error={hasError("purpose")}
              helperText={
                getErrorMessage("purpose") ||
                `${(formData.purpose || "").length}/250 - A short description of the channel's purpose.`
              }
              margin="normal"
              multiline
              maxRows={2}
              inputProps={{ maxLength: 250 }}
            />
          </Grid>

          {/* Header */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Header (Optional)"
              name="header"
              value={formData.header || ""}
              onChange={(e) => onFieldChange("header", e.target.value)}
              disabled={isLoading}
              error={hasError("header")}
              helperText={
                getErrorMessage("header") ||
                `${(formData.header || "").length}/1024 - Additional information displayed at the top of the channel.`
              }
              margin="normal"
              multiline
              rows={3}
              inputProps={{ maxLength: 1024 }}
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

      {/* Action buttons */}
      <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          disabled={isLoading || !isValid}
        >
          Create Channel
        </Button>
      </Box>
    </Paper>
  );
};

export default ChannelCreateUI;
