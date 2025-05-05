// src/internal/components/teams/TeamCreateUI.tsx
/**
 * Team Creation UI Component
 * Provides a form for creating a new team
 */
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Radio,
  RadioGroup,
  Divider,
  CircularProgress,
  Collapse,
  InputAdornment,
  Avatar,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Team } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";
import { stringToColor } from "../../../utils/mattermostUtils";

export interface TeamCreateUIProps extends BaseComponentProps {
  // Form data and validation
  formData: {
    display_name?: string;
    name?: string;
    description?: string;
    type?: "O" | "I";
    company_name?: string;
    allowed_domains?: string;
  };
  errors: Record<string, string>;
  // State props
  isLoading?: boolean;
  isValid?: boolean;
  // Callback props
  onFieldChange: (field: string, value: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  // Optional props
  nameGenerator?: (displayName: string) => string;
}

const TeamCreateUI: React.FC<TeamCreateUIProps> = ({
  formData,
  errors,
  isLoading = false,
  isValid = false,
  onFieldChange,
  onSubmit,
  onCancel,
  nameGenerator,
  className,
  sx,
  id,
}) => {
  // State for advanced options visibility
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate team name from display name if not set manually
  useEffect(() => {
    if (formData.display_name && !formData.name && nameGenerator) {
      const generatedName = nameGenerator(formData.display_name);
      onFieldChange("name", generatedName);
    }
  }, [formData.display_name, formData.name, nameGenerator, onFieldChange]);

  // Handle text field change
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };

  // Handle radio change
  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };

  // Toggle advanced options
  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  // Helper to get the error message for a field
  const getErrorMessage = (field: string): string => {
    return errors[field] || "";
  };

  // Helper to determine if a field has an error
  const hasError = (field: string): boolean => {
    return !!errors[field];
  };

  // Get avatar color and initials for preview
  const avatarColor = formData.display_name
    ? stringToColor(formData.display_name)
    : "#1976d2";

  const getInitials = (name: string): string => {
    if (!name) return "";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const initials = formData.display_name
    ? getInitials(formData.display_name)
    : "";

  return (
    <Box className={className} sx={sx} id={id}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Create a New Team
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Create a new team to collaborate with your colleagues. Fields marked
          with an asterisk (*) are required.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Team Name and Avatar Preview */}
        <Box display="flex" alignItems="flex-start" mb={3}>
          <Avatar
            sx={{
              bgcolor: avatarColor,
              width: 64,
              height: 64,
              fontSize: "1.5rem",
              mr: 2,
            }}
          >
            {initials}
          </Avatar>

          <Box flexGrow={1}>
            <TextField
              label="Team Name *"
              name="display_name"
              fullWidth
              variant="outlined"
              value={formData.display_name || ""}
              onChange={handleTextChange}
              disabled={isLoading}
              error={hasError("display_name")}
              helperText={
                getErrorMessage("display_name") ||
                "This is how your team will appear in menus and headers."
              }
              required
              autoFocus
            />
          </Box>
        </Box>

        {/* Team URL */}
        <TextField
          label="Team URL *"
          name="name"
          fullWidth
          variant="outlined"
          value={formData.name || ""}
          onChange={handleTextChange}
          disabled={isLoading}
          error={hasError("name")}
          helperText={
            getErrorMessage("name") ||
            "Use only lowercase letters, numbers and hyphens. Must start with a letter and cannot end in a hyphen."
          }
          required
          InputProps={{
            startAdornment: <InputAdornment position="start">/</InputAdornment>,
          }}
          sx={{ mb: 3 }}
        />

        {/* Description */}
        <TextField
          label="Description"
          name="description"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={formData.description || ""}
          onChange={handleTextChange}
          disabled={isLoading}
          error={hasError("description")}
          helperText={
            getErrorMessage("description") ||
            "Describe what this team will be used for."
          }
          sx={{ mb: 3 }}
        />

        {/* Team Type */}
        <FormControl
          component="fieldset"
          sx={{ mb: 3 }}
          error={hasError("type")}
        >
          <Typography variant="subtitle2" gutterBottom>
            Team Type *
          </Typography>
          <RadioGroup
            name="type"
            value={formData.type || "O"}
            onChange={handleRadioChange}
          >
            <FormControlLabel
              value="O"
              control={<Radio disabled={isLoading} />}
              label="Open Team - Anyone can join"
              disabled={isLoading}
            />
            <FormControlLabel
              value="I"
              control={<Radio disabled={isLoading} />}
              label="Invite Only - Members must be invited"
              disabled={isLoading}
            />
          </RadioGroup>
          {hasError("type") && (
            <FormHelperText>{getErrorMessage("type")}</FormHelperText>
          )}
        </FormControl>

        {/* Advanced Options Toggle */}
        <Button
          color="inherit"
          onClick={toggleAdvanced}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          }
          sx={{ mb: 1 }}
        >
          Advanced Options
        </Button>

        {/* Advanced Options */}
        <Collapse in={showAdvanced}>
          <Box sx={{ mt: 2, mb: 3 }}>
            {/* Company Name */}
            <TextField
              label="Company Name"
              name="company_name"
              fullWidth
              variant="outlined"
              value={formData.company_name || ""}
              onChange={handleTextChange}
              disabled={isLoading}
              error={hasError("company_name")}
              helperText={getErrorMessage("company_name")}
              sx={{ mb: 3 }}
            />

            {/* Allowed Domains */}
            <TextField
              label="Allowed Domains"
              name="allowed_domains"
              fullWidth
              variant="outlined"
              value={formData.allowed_domains || ""}
              onChange={handleTextChange}
              disabled={isLoading}
              error={hasError("allowed_domains")}
              helperText={
                getErrorMessage("allowed_domains") ||
                "Comma-separated list of domains that can join this team (e.g., company.com, org.edu)"
              }
            />
          </Box>
        </Collapse>

        {/* Form Actions */}
        <Divider sx={{ mt: 3, mb: 3 }} />

        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onSubmit}
            disabled={isLoading || !isValid}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isLoading ? "Creating..." : "Create Team"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default TeamCreateUI;
