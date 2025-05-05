// src/internal/components/teams/TeamSettingsUI.tsx
/**
 * Team Settings UI Component
 * Provides a form for editing team settings
 */
import React from "react";
import {
  Box,
  TextField,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Switch,
  Button,
  Grid,
  Typography,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  CircularProgress,
} from "@mui/material";
import { Team } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";

export interface TeamSettingsUIProps extends BaseComponentProps {
  // Data props
  team: Team | null;
  formData: Record<string, any>;
  errors: Record<string, string>;
  // State props
  isLoading?: boolean;
  isValid?: boolean;
  isDirty?: boolean;
  // Config props
  editableFields?: Array<
    | "display_name"
    | "description"
    | "company_name"
    | "allowed_domains"
    | "allow_open_invite"
  >;
  // Callback props
  onFieldChange: (field: string, value: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const TeamSettingsUI: React.FC<TeamSettingsUIProps> = ({
  team,
  formData,
  errors,
  isLoading = false,
  isValid = true,
  isDirty = false,
  editableFields = [
    "display_name",
    "description",
    "company_name",
    "allowed_domains",
    "allow_open_invite",
  ],
  onFieldChange,
  onSubmit,
  onCancel,
  className,
  sx,
  id,
}) => {
  // Helper to check if a field is editable
  const isFieldEditable = (field: string): boolean => {
    return editableFields.includes(field as any);
  };

  // Handle text field change
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };

  // Handle switch change
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFieldChange(name, checked);
  };

  // Handle select change
  const handleSelectChange = (
    e: React.ChangeEvent<{ name?: string; value: unknown }>,
  ) => {
    const name = e.target.name as string;
    const value = e.target.value;
    onFieldChange(name, value);
  };

  // Helper to get the error message for a field
  const getErrorMessage = (field: string): string => {
    return errors[field] || "";
  };

  // Helper to determine if a field has an error
  const hasError = (field: string): boolean => {
    return !!errors[field];
  };

  return (
    <Box className={className} sx={sx} id={id}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Team Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Update your team settings below. Fields marked with an asterisk (*)
          are required.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          {/* Team Display Name */}
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Team Name *"
              name="display_name"
              fullWidth
              variant="outlined"
              value={formData.display_name || ""}
              onChange={handleTextChange}
              disabled={isLoading || !isFieldEditable("display_name")}
              error={hasError("display_name")}
              helperText={getErrorMessage("display_name")}
              required
            />
          </Grid>

          {/* Team Description */}
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Description"
              name="description"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={formData.description || ""}
              onChange={handleTextChange}
              disabled={isLoading || !isFieldEditable("description")}
              error={hasError("description")}
              helperText={
                getErrorMessage("description") ||
                "Provide a short description of your team's purpose."
              }
            />
          </Grid>

          {/* Company Name */}
          {isFieldEditable("company_name") && (
            <Grid size={{ xs: 12, md: 6 }}>
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
              />
            </Grid>
          )}

          {/* Allowed Domains */}
          {isFieldEditable("allowed_domains") && (
            <Grid size={{ xs: 12, md: 6 }}>
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
                  "Comma-separated list of domains allowed to join (e.g., example.com, domain.org)"
                }
              />
            </Grid>
          )}

          {/* Allow Open Invite */}
          {isFieldEditable("allow_open_invite") && (
            <Grid size={{ xs: 12 }}>
              <FormControl
                component="fieldset"
                error={hasError("allow_open_invite")}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!formData.allow_open_invite}
                      onChange={handleSwitchChange}
                      name="allow_open_invite"
                      disabled={isLoading}
                      color="primary"
                    />
                  }
                  label="Allow anyone to join this team with a link"
                />
                {hasError("allow_open_invite") && (
                  <FormHelperText>
                    {getErrorMessage("allow_open_invite")}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
          )}
        </Grid>

        <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
          <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onSubmit}
            disabled={isLoading || !isValid || !isDirty}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default TeamSettingsUI;
