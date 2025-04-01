import { useFormik } from "formik";
import * as Yup from "yup";
import { TextField, Button, Box, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";

const SpaceForm = ({ space, onSubmit, onCancel, isSubmitting = false }) => {
  const { t } = useTranslation();

  // Schéma de validation
  const validationSchema = Yup.object({
    name: Yup.string()
      .required(t("spaces.form.nameRequired"))
      .min(2, t("spaces.form.nameMinLength"))
      .max(255, t("spaces.form.nameMaxLength")),
  });

  const formik = useFormik({
    initialValues: {
      name: space?.name || "",
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <TextField
        fullWidth
        id="name"
        name="name"
        label={t("spaces.form.name")}
        value={formik.values.name}
        onChange={formik.handleChange}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        margin="normal"
        autoFocus
      />

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
          {isSubmitting ? (
            <CircularProgress size={24} />
          ) : space ? (
            t("common.save")
          ) : (
            t("common.create")
          )}
        </Button>
      </Box>
    </form>
  );
};

export default SpaceForm;
