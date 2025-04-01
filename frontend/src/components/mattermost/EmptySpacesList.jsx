import { Card, CardContent, Typography, Box, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

/**
 * Composant affiché lorsqu'aucun espace n'est disponible
 */
const EmptySpacesList = ({ onAddClick }) => {
  const { t } = useTranslation();

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography
          variant="body1"
          align="center"
          color="textSecondary"
          py={4}
          component={"div"}
        >
          {t("spaces.noSpaces")}
        </Typography>
        <Box display="flex" justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddClick}
          >
            {t("spaces.createFirst")}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EmptySpacesList;
