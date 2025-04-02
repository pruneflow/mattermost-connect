// src/components/channels/EditChannelForm.jsx
import { useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Alert,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";

const EditChannelForm = ({
  channel,
  onSubmit,
  onCancel,
  isSubmitting = false,
  spaceId,
}) => {
  const { t } = useTranslation();

  // Schéma de validation
  const validationSchema = Yup.object({
    display_name: Yup.string()
      .required(t("channels.form.displayNameRequired"))
      .min(2, t("channels.form.displayNameMinLength"))
      .max(64, t("channels.form.displayNameMaxLength")),
    purpose: Yup.string().max(250, t("channels.form.purposeMaxLength")),
    header: Yup.string().max(1024, t("channels.form.headerMaxLength")),
  });

  const formik = useFormik({
    initialValues: {
      display_name: channel?.display_name || "",
      purpose: channel?.purpose || "",
      header: channel?.header || "",
      spaceId: spaceId,
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit(values);
    },
    enableReinitialize: true, // Important pour réinitialiser le formulaire quand le canal change
  });

  const isDefaultChannel = channel?.isDefaultChannel || false;

  return (
    <form onSubmit={formik.handleSubmit}>
      {isDefaultChannel && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("channels.form.defaultChannelWarning")}
        </Alert>
      )}

      <TextField
        fullWidth
        id="display_name"
        name="display_name"
        label={t("channels.form.displayName")}
        value={formik.values.display_name}
        onChange={formik.handleChange}
        error={
          formik.touched.display_name && Boolean(formik.errors.display_name)
        }
        helperText={formik.touched.display_name && formik.errors.display_name}
        margin="normal"
        autoFocus
        disabled={isDefaultChannel}
      />

      <TextField
        fullWidth
        id="purpose"
        name="purpose"
        label={t("channels.form.purpose")}
        value={formik.values.purpose}
        onChange={formik.handleChange}
        error={formik.touched.purpose && Boolean(formik.errors.purpose)}
        helperText={
          (formik.touched.purpose && formik.errors.purpose) ||
          t("channels.form.purposeHelp")
        }
        margin="normal"
        multiline
        rows={2}
      />

      <TextField
        fullWidth
        id="header"
        name="header"
        label={t("channels.form.header")}
        value={formik.values.header}
        onChange={formik.handleChange}
        error={formik.touched.header && Boolean(formik.errors.header)}
        helperText={
          (formik.touched.header && formik.errors.header) ||
          t("channels.form.headerHelp")
        }
        margin="normal"
        multiline
        rows={3}
      />

      {/* Informations sur le canal (affichage seulement) */}
      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography variant="body2" color="textSecondary">
          {t("channels.form.channelInfo", { name: channel?.name })}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t("channels.form.channelType")}:{" "}
          {t(`channels.types.${channel?.type}`)}
        </Typography>
        {channel?.creator && (
          <Typography variant="body2" color="textSecondary">
            {t("channels.details.creator")}: {channel.creator.displayName}
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={onCancel} sx={{ mr: 1 }}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : t("common.save")}
        </Button>
      </Box>
    </form>
  );
};

export default EditChannelForm;
