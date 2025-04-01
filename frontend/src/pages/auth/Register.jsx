import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Grid,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";

const Register = () => {
  const { t } = useTranslation();
  const { registerAndLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // Schéma de validation avec Yup
  const RegisterSchema = Yup.object().shape({
    firstName: Yup.string().required(t("auth.validation.firstNameRequired")),
    lastName: Yup.string().required(t("auth.validation.lastNameRequired")),
    companyName: Yup.string().required(t("auth.validation.companyRequired")),
    email: Yup.string()
      .email(t("auth.validation.invalidEmail"))
      .required(t("auth.validation.emailRequired")),
    password: Yup.string()
      .min(8, t("auth.validation.passwordMinLength"))
      .required(t("auth.validation.passwordRequired")),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password"), null], t("auth.validation.passwordsMatch"))
      .required(t("auth.validation.confirmRequired")),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Supprimer confirmPassword avant l'envoi
      const { confirmPassword, ...userData } = values;

      await registerAndLogin(userData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {t("auth.register")}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Formik
            initialValues={{
              firstName: "",
              lastName: "",
              companyName: "",
              email: "",
              password: "",
              confirmPassword: "",
            }}
            validationSchema={RegisterSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Field
                      as={TextField}
                      name="firstName"
                      label={t("auth.firstName")}
                      fullWidth
                      margin="normal"
                      error={touched.firstName && Boolean(errors.firstName)}
                      helperText={touched.firstName && errors.firstName}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Field
                      as={TextField}
                      name="lastName"
                      label={t("auth.lastName")}
                      fullWidth
                      margin="normal"
                      error={touched.lastName && Boolean(errors.lastName)}
                      helperText={touched.lastName && errors.lastName}
                    />
                  </Grid>
                </Grid>

                <Field
                  as={TextField}
                  name="companyName"
                  label={t("auth.companyName")}
                  fullWidth
                  margin="normal"
                  error={touched.companyName && Boolean(errors.companyName)}
                  helperText={touched.companyName && errors.companyName}
                />

                <Field
                  as={TextField}
                  name="email"
                  label={t("auth.email")}
                  fullWidth
                  margin="normal"
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                />

                <Field
                  as={TextField}
                  name="password"
                  label={t("auth.password")}
                  type="password"
                  fullWidth
                  margin="normal"
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                />

                <Field
                  as={TextField}
                  name="confirmPassword"
                  label={t("auth.confirmPassword")}
                  type="password"
                  fullWidth
                  margin="normal"
                  error={
                    touched.confirmPassword && Boolean(errors.confirmPassword)
                  }
                  helperText={touched.confirmPassword && errors.confirmPassword}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} />
                  ) : (
                    t("auth.registerButton")
                  )}
                </Button>

                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Typography variant="body2">
                    {t("auth.alreadyAccount")}{" "}
                    <Link to="/login" style={{ textDecoration: "none" }}>
                      {t("auth.loginLink")}
                    </Link>
                  </Typography>
                </Box>
              </Form>
            )}
          </Formik>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
