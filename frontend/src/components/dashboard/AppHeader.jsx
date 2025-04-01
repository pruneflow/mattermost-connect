import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../common";

/**
 * Composant d'en-tête de l'application avec la barre de navigation
 */
const AppHeader = ({ onLogout }) => {
  const { t } = useTranslation();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t("dashboard.adminTitle")}
        </Typography>
        <LanguageSwitcher />
        <Button color="inherit" onClick={onLogout}>
          {t("dashboard.logout")}
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;
