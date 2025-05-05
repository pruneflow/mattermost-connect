// src/internal/containers/teams/TeamSettingsContainer.tsx
import React, { useCallback, useEffect } from "react";
import { useFormContainer } from "../base/FormContainer";
import { useContainerTeam } from "../../hooks/useContainerTeam";
import { Team, UpdateTeamParams } from "../../../types";
import TeamSettingsUI from "../../components/teams/TeamSettingsUI";
import { useDialog } from "../../hooks";

export interface TeamSettingsContainerProps {
  teamId: string;
  team?: Team;
  editableFields?: Array<
    | "display_name"
    | "description"
    | "company_name"
    | "allowed_domains"
    | "allow_open_invite"
  >;
  onUpdate?: (team: Team) => void;
  onCancel?: () => void;
  className?: string;
  sx?: React.CSSProperties;
  id?: string;
}

const TeamSettingsContainer: React.FC<TeamSettingsContainerProps> = (props) => {
  const {
    teamId,
    team: propTeam,
    editableFields = [
      "display_name",
      "description",
      "company_name",
      "allowed_domains",
      "allow_open_invite",
    ],
    onUpdate,
    onCancel,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  const {
    team: fetchedTeam,
    updateTeam,
    isUpdating,
  } = useContainerTeam(teamId);

  const team = propTeam || fetchedTeam;

  const getInitialData = useCallback(() => {
    if (!team) return {};

    return {
      display_name: team.display_name || "",
      description: team.description || "",
      company_name: team.company_name || "",
      allowed_domains: team.allowed_domains || "",
      allow_open_invite: team.allow_open_invite || false,
    };
  }, [team]);

  const [formState, formAPI] = useFormContainer({
    initialData: getInitialData(),
    validator: (data: {
      display_name: string;
      description: string;
      company_name: string;
      allowed_domains: string;
      allow_open_invite: boolean;
    }) => {
      const errors: Record<string, string> = {};

      if (!data.display_name) {
        errors.display_name = "Team name is required";
      } else if (data.display_name.length < 2) {
        errors.display_name = "Team name must be at least 2 characters";
      } else if (data.display_name.length > 64) {
        errors.display_name = "Team name must be less than 64 characters";
      }

      return Object.keys(errors).length ? errors : true;
    },
    onSubmit: async (data) => {
      if (!team) return null;

      const updateData: UpdateTeamParams = {};

      // Only include fields that changed
      if (data.display_name !== team.display_name) {
        updateData.display_name = data.display_name;
      }

      if (data.description !== team.description) {
        updateData.description = data.description;
      }

      if (data.company_name !== team.company_name) {
        updateData.company_name = data.company_name;
      }

      if (data.allowed_domains !== team.allowed_domains) {
        updateData.allowed_domains = data.allowed_domains;
      }

      if (data.allow_open_invite !== team.allow_open_invite) {
        updateData.allow_open_invite = data.allow_open_invite;
      }

      try {
        const updatedTeam = await updateTeam(updateData);

        if (updatedTeam && onUpdate) {
          onUpdate(updatedTeam);
        }

        return updatedTeam;
      } catch (error) {
        throw error;
      }
    },
  });

  // Update form data when team changes
  useEffect(() => {
    if (team && !formState.isDirty) {
      formAPI.setFieldValues(getInitialData());
    }
  }, [team, formState.isDirty, getInitialData, formAPI]);

  const handleCancel = useCallback(async () => {
    if (formState.isDirty) {
      const confirmed = await dialog.confirmAsync({
        title: "Discard Changes",
        message:
          "You have unsaved changes. Are you sure you want to discard them?",
        confirmText: "Discard Changes",
        cancelText: "Continue Editing",
      });

      if (!confirmed) return;
    }

    formAPI.resetForm();
    if (onCancel) onCancel();
  }, [formState.isDirty, dialog, formAPI, onCancel]);

  const handleFieldChange = useCallback(
    (field: any, value: any) => {
      formAPI.setFieldValue(field, value);
    },
    [formAPI],
  );

  const handleSubmit = useCallback(() => {
    formAPI.submitForm();
  }, [formAPI]);

  const uiProps = {
    team,
    formData: formState.formData,
    errors: formState.errors,
    isLoading: formState.isSubmitting || isUpdating,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    editableFields,
    onFieldChange: handleFieldChange,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    className,
    sx,
    id,
  };

  return <TeamSettingsUI {...uiProps} />;
};

export default TeamSettingsContainer;
