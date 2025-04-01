// src/components/statistics/StatisticsPanel.jsx
import { useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Button,
} from "@mui/material";
import {
  BarChart as BarChartIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
  VpnKey as KeyIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, ErrorState } from "../common";
import { statisticsService } from "../../api/statistics";

// Composant de carte de statistique
const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card elevation={2} sx={{ height: "100%" }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={2}>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            color: `${color}.main`,
            p: 1,
            borderRadius: 1,
            mr: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" fontWeight="bold">
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="textSecondary" mt={1}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const StatisticsPanel = ({ user }) => {
  const { t } = useTranslation();

  // Récupérer les statistiques
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["statistics"],
    queryFn: () => statisticsService.getUserStatistics(),
    staleTime: 5 * 60 * 1000, // 5 minutes avant de considérer les données comme périmées
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Calcul du taux d'espaces avec token API
  const tokenRate =
    data.totalSpaces > 0
      ? Math.round((data.withToken / data.totalSpaces) * 100)
      : 0;

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" component="h2">
          {t("statistics.overview")}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
        >
          {t("statistics.refresh")}
        </Button>
      </Box>

      {/* Statistiques principales */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t("statistics.totalSpaces")}
            value={data.totalSpaces}
            icon={<StorageIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t("statistics.activeSpaces")}
            value={data.activeSpaces}
            icon={<BarChartIcon />}
            color="success"
            subtitle={
              data.totalSpaces > 0
                ? t("statistics.percentActive", {
                    value: Math.round(
                      (data.activeSpaces / data.totalSpaces) * 100,
                    ),
                  })
                : ""
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t("statistics.spacesWithToken")}
            value={data.withToken}
            icon={<KeyIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t("statistics.inactiveSpaces")}
            value={data.inactiveSpaces}
            icon={<BarChartIcon />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Statistiques d'administration (uniquement pour les admins) */}
      {user.isAdmin && data.adminStats && (
        <>
          <Typography variant="h5" component="h2" mb={2}>
            {t("statistics.adminSection")}
          </Typography>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title={t("statistics.totalUsers")}
                value={data.adminStats.totalUsers}
                icon={<PeopleIcon />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title={t("statistics.totalSpacesGlobal")}
                value={data.adminStats.totalSpacesGlobal}
                icon={<StorageIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title={t("statistics.averageSpacesPerUser")}
                value={data.adminStats.averageSpacesPerUser.toFixed(1)}
                icon={<BarChartIcon />}
                color="warning"
              />
            </Grid>
          </Grid>
        </>
      )}

      {/* Informations détaillées */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t("statistics.tokenUsage")}
        </Typography>
        <Typography variant="body2" paragraph>
          {t("statistics.tokenExplanation")}
        </Typography>

        <Box mb={2}>
          <Typography variant="body2" mb={1}>
            {t("statistics.tokenRate")}: {tokenRate}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={tokenRate}
            color={
              tokenRate < 40 ? "error" : tokenRate < 70 ? "warning" : "success"
            }
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
      </Paper>

      {/* Liste des espaces (uniquement si au moins un espace est disponible) */}
      {data.totalSpaces > 0 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t("statistics.latestSpaces")}
          </Typography>
          <List>
            {data.newestSpace && (
              <ListItem divider>
                <ListItemText
                  primary={data.newestSpace.name}
                  secondary={t("statistics.created", {
                    date: new Date(
                      data.newestSpace.createdAt,
                    ).toLocaleDateString(),
                  })}
                />
                <ListItemSecondaryAction>
                  <Chip
                    color={data.newestSpace.isActive ? "success" : "error"}
                    size="small"
                    label={
                      data.newestSpace.isActive
                        ? t("spaces.active")
                        : t("spaces.inactive")
                    }
                  />
                </ListItemSecondaryAction>
              </ListItem>
            )}
            {data.oldestSpace &&
              data.oldestSpace.id !== data.newestSpace?.id && (
                <ListItem>
                  <ListItemText
                    primary={data.oldestSpace.name}
                    secondary={t("statistics.created", {
                      date: new Date(
                        data.oldestSpace.createdAt,
                      ).toLocaleDateString(),
                    })}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      color={data.oldestSpace.isActive ? "success" : "error"}
                      size="small"
                      label={
                        data.oldestSpace.isActive
                          ? t("spaces.active")
                          : t("spaces.inactive")
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              )}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default StatisticsPanel;
