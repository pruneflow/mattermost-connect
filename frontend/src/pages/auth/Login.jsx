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
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // Schéma de validation avec Yup
  const LoginSchema = Yup.object().shape({
    email: Yup.string()
      .email(t("auth.validation.invalidEmail"))
      .required(t("auth.validation.emailRequired")),
    password: Yup.string().required(t("auth.validation.passwordRequired")),
  });

  // Gestionnaire de soumission explicite pour éviter le rechargement
  const handleFormSubmit = async (values, { setSubmitting }) => {
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (err) {
      // Capturer l'erreur sans recharger la page
      const errorMessage = err.response?.data?.message || "Invalid login";
      setError(errorMessage);
      console.error("Erreur de connexion:", errorMessage);
    } finally {
      setSubmitting(false);
    }

    // Retourner false de manière explicite pour éviter toute propagation
    return false;
  };

  return (
    <Container maxWidth="sm">
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
            {t("auth.login")}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={LoginSchema}
            onSubmit={handleFormSubmit}
          >
            {({ errors, touched, isSubmitting, handleSubmit }) => (
              <form onSubmit={handleSubmit}>
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
                    t("auth.loginButton")
                  )}
                </Button>

                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Typography variant="body2">
                    {t("auth.noAccount")}{" "}
                    <Link to="/register" style={{ textDecoration: "none" }}>
                      {t("auth.signupLink")}
                    </Link>
                  </Typography>
                </Box>
              </form>
            )}
          </Formik>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
