// src/internal/containers/channels/ChannelSettingsContainer.tsx
/**
 * Container for channel settings
 * Handles form state and validation for updating channel settings
 */
import React, { useCallback, useEffect, useMemo } from "react";
import { useFormContainer } from "../base/FormContainer";
import { useChannel, useDirectChannel } from "../../../hooks";
import { Channel, UpdateChannelParams } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import ChannelSettingsUI from "../../components/channels/ChannelSettingsUI";

export interface ChannelSettingsContainerProps {
  /** Channel ID */
  channelId?: string;
  /** Channel object (if already available) */
  channel?: Channel;
  /** Whether form is in edit mode */
  editMode?: boolean;
  /** Editable fields */
  editableFields?: Array<"display_name" | "name" | "header" | "purpose">;
  /** Callback when update succeeds */
  onUpdate?: (channel: Channel) => void;
  /** Callback when edit is cancelled */
  onCancel?: () => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for channel settings
 * Manages form state and validation for updating channel settings
 */
const ChannelSettingsContainer: React.FC<ChannelSettingsContainerProps> = (
  props,
) => {
  const {
    channelId,
    channel: propChannel,
    editMode = false,
    editableFields = ["display_name", "header", "purpose"],
    onUpdate,
    onCancel,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use channel hook for data and operations
  const {
    channel: fetchedChannel,
    update: updateChannel,
    isUpdating,
    isLoading,
  } = useChannel(channelId);

  // Get direct channel specific info
  const { isDirect, isGroup } = useDirectChannel(channelId);

  const channel = propChannel || fetchedChannel;

  // Get initial form data
  const getInitialData = useCallback(() => {
    if (!channel) return {};

    return {
      display_name: channel.display_name || "",
      name: channel.name || "",
      header: channel.header || "",
      purpose: channel.purpose || "",
    };
  }, [channel]);

  // Use FormContainer for form management
  const [formState, formAPI] = useFormContainer({
    initialData: getInitialData(),
    validator: (data: {
      display_name: string;
      name: string;
      header: string;
      purpose: string;
    }) => {
      const errors: Record<string, string> = {};

      // Direct and group channels have limited editable fields
      const isDirectOrGroup = isDirect || isGroup;

      // Validate display name for non-direct/group channels
      if (!isDirectOrGroup && !data.display_name) {
        errors.display_name = "Channel name is required";
      } else if (!isDirectOrGroup && data.display_name.length < 2) {
        errors.display_name = "Channel name must be at least 2 characters";
      } else if (!isDirectOrGroup && data.display_name.length > 64) {
        errors.display_name = "Channel name must be less than 64 characters";
      }

      // Validate URL name for non-direct/group channels
      if (!isDirectOrGroup && data.name && data.name.length < 2) {
        errors.name = "Channel URL must be at least 2 characters";
      } else if (!isDirectOrGroup && data.name && data.name.length > 64) {
        errors.name = "Channel URL must be less than 64 characters";
      }

      // Validate header length
      if (data.header && data.header.length > 1024) {
        errors.header = "Header must be less than 1024 characters";
      }

      // Validate purpose length
      if (data.purpose && data.purpose.length > 250) {
        errors.purpose = "Purpose must be less than 250 characters";
      }

      return Object.keys(errors).length ? errors : true;
    },
    onSubmit: async (data) => {
      if (!channel) return null;

      const updateData: UpdateChannelParams = {};

      // Only include fields that changed
      if (data.display_name !== channel.display_name) {
        updateData.display_name = data.display_name;
      }

      if (data.name !== channel.name && !isDirect && !isGroup) {
        updateData.name = data.name;
      }

      if (data.header !== channel.header) {
        updateData.header = data.header;
      }

      if (data.purpose !== channel.purpose) {
        updateData.purpose = data.purpose;
      }

      // Only submit if there are changes
      if (Object.keys(updateData).length === 0) {
        if (onUpdate) {
          onUpdate(channel);
        }
        return channel;
      }

      try {
        const updatedChannel = await updateChannel(updateData);

        if (updatedChannel && onUpdate) {
          onUpdate(updatedChannel);
        }

        return updatedChannel;
      } catch (error) {
        throw error;
      }
    },
    onError: (error) => {
      dialog.showError(
        "Update Failed",
        error?.message || "Failed to update channel settings",
      );
    },
  });

  // Update form data when channel changes
  useEffect(() => {
    if (channel && !formState.isDirty) {
      formAPI.setFieldValues(getInitialData());
    }
  }, [channel, formState.isDirty, getInitialData, formAPI]);

  // Handle cancel with unsaved changes confirmation
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

  // Handle field change
  const handleFieldChange = useCallback(
    (field: "name" | "display_name" | "header" | "purpose", value: any) => {
      formAPI.setFieldValue(field, value);
    },
    [formAPI],
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    formAPI.submitForm();
  }, [formAPI]);

  // Filter editable fields based on channel type
  const filteredEditableFields = useMemo(() => {
    if (isDirect || isGroup) {
      // Direct and group channels can only edit header and purpose
      return editableFields.filter(
        (field) => field === "header" || field === "purpose",
      );
    }
    return editableFields;
  }, [editableFields, isDirect, isGroup]);

  // Prepare UI props
  const uiProps = {
    formData: {
      display_name: formState.formData.display_name || "",
      name: formState.formData.name || "",
      header: formState.formData.header || "",
      purpose: formState.formData.purpose || "",
    },
    errors: formState.errors,
    isLoading: formState.isSubmitting || isUpdating || isLoading,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
    editMode,
    editableFields: filteredEditableFields,
    isDirectOrGroup: isDirect || isGroup,
    onFieldChange: handleFieldChange,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    className,
    sx,
    id,
  };

  return <ChannelSettingsUI {...uiProps} />;
};

export default ChannelSettingsContainer;
