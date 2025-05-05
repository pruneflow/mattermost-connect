// src/internal/containers/channels/ChannelCreateContainer.tsx
/**
 * Container for channel creation
 * Handles form state and validation for creating new channels
 */
import React, { useCallback } from "react";
import { useFormContainer } from "../base/FormContainer";
import { useContainerChannel } from "../../hooks/useContainerChannel";
import { Channel, CreateChannelParams } from "../../../types";
import ChannelCreateUI from "../../components/channels/ChannelCreateUI";
import { useDialog } from "../../hooks/useDialog";

export interface ChannelCreateContainerProps {
  /** Team ID for the new channel */
  teamId: string;
  /** Initial form data */
  initialData?: Partial<CreateChannelParams>;
  /** Callback when creation succeeds */
  onCreateSuccess?: (channel: Channel) => void;
  /** Callback when creation is cancelled */
  onCancel?: () => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

export type ChannelCreateField =
  | "name"
  | "display_name"
  | "purpose"
  | "header"
  | "type";

/**
 * Container for channel creation
 * Manages form state and validation for creating new channels
 */
const ChannelCreateContainer: React.FC<ChannelCreateContainerProps> = (
  props,
) => {
  const { teamId, initialData, onCreateSuccess, onCancel, className, sx, id } =
    props;

  const dialog = useDialog();

  // Use channel container hook
  const { createChannel } = useContainerChannel();

  // Use form container hook
  const [formState, formAPI] = useFormContainer({
    initialData: initialData || {
      team_id: teamId,
      display_name: "",
      name: "",
      purpose: "",
      header: "",
      type: "O", // Default to Public channel
    },
    validator: (data) => {
      const errors: Record<string, string> = {};

      // Validate display name
      if (!data.display_name) {
        errors.display_name = "Channel name is required";
      } else if (data.display_name.length < 2) {
        errors.display_name = "Channel name must be at least 2 characters";
      } else if (data.display_name.length > 64) {
        errors.display_name = "Channel name must be less than 64 characters";
      }

      // Validate URL name if provided
      if (data.name) {
        // Simple URL validation - would use a more robust validator in production
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(data.name)) {
          errors.name =
            "Invalid channel URL. Use only lowercase letters, numbers and hyphens. Must start with a letter or number and cannot end in a hyphen.";
        }
      }

      // Validate purpose length
      if (data.purpose && data.purpose.length > 250) {
        errors.purpose = "Purpose must be less than 250 characters";
      }

      // Validate header length
      if (data.header && data.header.length > 1024) {
        errors.header = "Header must be less than 1024 characters";
      }

      return Object.keys(errors).length ? errors : true;
    },
    onSubmit: async (data) => {
      // Create channel params
      const createParams: CreateChannelParams = {
        team_id: teamId,
        name: data.name || sanitizeChannelName(data.display_name),
        display_name: data.display_name,
        type: data.type || "O",
      };

      // Add optional fields if provided
      if (data.purpose) createParams.purpose = data.purpose;
      if (data.header) createParams.header = data.header;

      try {
        const channel = await createChannel(createParams);

        if (channel && onCreateSuccess) {
          onCreateSuccess(channel);
        }

        return channel;
      } catch (error) {
        await dialog.showError(
          "Channel Creation Failed",
          error instanceof Error ? error.message : "Failed to create channel",
        );
        throw error;
      }
    },
  });

  // Function to sanitize channel name
  const sanitizeChannelName = (displayName: string): string => {
    return displayName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 64);
  };

  // Handle field change
  const handleFieldChange = useCallback(
    (field: ChannelCreateField, value: any) => {
      formAPI.setFieldValue(field, value);

      // If display name changes, auto-generate URL name
      if (field === "display_name" && !formState.dirtyFields.name) {
        formAPI.setFieldValue("name", sanitizeChannelName(value));
      }
    },
    [formAPI, formState.dirtyFields.name],
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    formAPI.submitForm();
  }, [formAPI]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (formState.isDirty) {
      dialog
        .confirmAsync({
          title: "Discard Changes",
          message:
            "You have unsaved changes. Are you sure you want to discard them?",
          confirmText: "Discard Changes",
          cancelText: "Continue Editing",
        })
        .then((confirmed) => {
          if (confirmed && onCancel) {
            onCancel();
          }
        });
    } else if (onCancel) {
      onCancel();
    }
  }, [formState.isDirty, dialog, onCancel]);

  // Generate channel name from display name
  const nameGenerator = useCallback((displayName: string) => {
    return sanitizeChannelName(displayName);
  }, []);

  // Prepare UI props
  const uiProps = {
    formData: formState.formData,
    errors: formState.errors,
    isLoading: formState.isSubmitting,
    isValid: formState.isValid,
    onFieldChange: handleFieldChange,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    nameGenerator,
    className,
    sx,
    id,
  };

  return <ChannelCreateUI {...uiProps} />;
};

export default ChannelCreateContainer;
