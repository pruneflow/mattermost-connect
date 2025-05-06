// src/internal/containers/teams/TeamCreateContainer.tsx
import React, { useCallback } from "react";
import { useFormContainer } from "../base/FormContainer";
import { useTeamCreation } from "../../../hooks";
import { Team, CreateTeamParams } from "../../../types";
import TeamCreateUI from "../../components/teams/TeamCreateUI";
import { useDialog } from "../../hooks/useDialog";
import { SxProps, Theme } from "@mui/material";

export interface TeamCreateContainerProps {
  initialData?: Partial<CreateTeamParams>;
  onCreateSuccess?: (team: Team) => void;
  onCancel?: () => void;
  className?: string;
  sx?: SxProps<Theme>;
  id?: string;
}

export type TeamCreateField =
  | "name"
  | "display_name"
  | "description"
  | "type"
  | "company_name"
  | "allowed_domains";

/**
 * Container for team creation
 * Handles form state, validation, and submission for creating new teams
 */
const TeamCreateContainer: React.FC<TeamCreateContainerProps> = (props) => {
  const { initialData, onCreateSuccess, onCancel, className, sx, id } = props;

  const dialog = useDialog();
  const { createTeam, validateTeamName, sanitizeTeamName, isCreating } =
    useTeamCreation();

  const [formState, formAPI] = useFormContainer({
    initialData: initialData || {
      display_name: "",
      name: "",
      description: "",
      type: "O", // Default to Open team
      company_name: "",
      allowed_domains: "",
    },
    validator: (data) => {
      const errors: Record<string, string> = {};

      // Validate display name
      if (!data.display_name) {
        errors.display_name = "Team name is required";
      } else if (data.display_name.length < 2) {
        errors.display_name = "Team name must be at least 2 characters";
      } else if (data.display_name.length > 64) {
        errors.display_name = "Team name must be less than 64 characters";
      }

      // Validate team URL name if provided
      if (data.name) {
        if (!validateTeamName(data.name)) {
          errors.name =
            "Invalid team URL. Use only lowercase letters, numbers and hyphens. Must start with a letter and cannot end in a hyphen.";
        }
      }

      return Object.keys(errors).length ? errors : true;
    },
    onSubmit: async (data) => {
      // Create team params
      const createParams: CreateTeamParams = {
        name: data.name || sanitizeTeamName(data.display_name),
        display_name: data.display_name,
        type: data.type || "O",
      };

      // Add optional fields if provided
      if (data.description) createParams.description = data.description;
      if (data.company_name) createParams.company_name = data.company_name;
      if (data.allowed_domains)
        createParams.allowed_domains = data.allowed_domains;

      try {
        const team = await createTeam(createParams);

        if (onCreateSuccess) {
          onCreateSuccess(team);
        }

        return team;
      } catch (error) {
        await dialog.showError(
          "Team Creation Failed",
          error instanceof Error ? error.message : "Failed to create team",
        );
        throw error;
      }
    },
  });

  const handleFieldChange = useCallback(
    (field: TeamCreateField, value: any) => {
      formAPI.setFieldValue(field, value);

      // If display name changes, auto-generate URL name
      if (field === "display_name" && !formState.dirtyFields.name) {
        formAPI.setFieldValue("name", sanitizeTeamName(value));
      }
    },
    [formAPI, formState.dirtyFields.name, sanitizeTeamName],
  );

  const handleSubmit = useCallback(() => {
    formAPI.submitForm();
  }, [formAPI]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Generate team name from display name
  const nameGenerator = useCallback(
    (displayName: string) => {
      return sanitizeTeamName(displayName);
    },
    [sanitizeTeamName],
  );

  const uiProps = {
    formData: formState.formData,
    errors: formState.errors,
    isLoading: formState.isSubmitting || isCreating,
    isValid: formState.isValid,
    onFieldChange: handleFieldChange,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    nameGenerator,
    className,
    sx,
    id,
  };

  return <TeamCreateUI {...uiProps} />;
};

export default TeamCreateContainer;
