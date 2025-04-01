import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Bannière de bienvenue affichant les informations de l'utilisateur
 */
const WelcomeBanner = ({ user }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t("dashboard.title")}
      </Typography>
      <Typography variant="body1" component={"div"}>
        {t("dashboard.welcome")} {user?.firstName} {user?.lastName}{" "}
        {user?.companyName ? `de ${user?.companyName}` : ""} !
      </Typography>
    </Box>
  );
};

export default WelcomeBanner;
