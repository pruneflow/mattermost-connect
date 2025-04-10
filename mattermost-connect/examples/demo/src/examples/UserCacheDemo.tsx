// examples/demo/src/examples/UserCacheDemo.tsx
import React, { useState, useEffect } from "react";
import { useMattermost } from "mattermost-connect";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

/**
 * Composant de démonstration qui montre l'optimisation du cache utilisateur
 */
const UserCacheDemo: React.FC = () => {
  const { service, currentUser } = useMattermost();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [timings, setTimings] = useState<
    Array<{ action: string; time: number }>
  >([]);

  // Fonction pour mesurer le temps d'exécution d'une action
  const timeAction = async (name: string, action: () => Promise<any>) => {
    setLoading(true);
    setMessage(null);

    const start = performance.now();
    try {
      await action();
      const end = performance.now();
      const duration = end - start;

      // Ajouter cette mesure à la liste
      setTimings((prev) => [...prev, { action: name, time: duration }]);
      setMessage(`${name} terminé en ${duration.toFixed(2)} ms`);
    } catch (error) {
      console.error(`Erreur lors de ${name}:`, error);
      setMessage(
        `Erreur: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Vider le cache pour simuler un premier appel
  const clearUserCache = () => {
    if ("refreshCurrentUser" in service) {
      // Si le service implémente l'interface BaseService
      timeAction("Vidage du cache utilisateur", async () => {
        await service.refreshCurrentUser();
        setMessage(
          "Cache utilisateur vidé, la prochaine requête utilisera l'API",
        );
      });
    } else {
      setMessage("Ce service ne prend pas en charge le vidage du cache");
    }
  };

  // Récupérer l'utilisateur (avec cache)
  const getUser = () => {
    timeAction("Récupération de l'utilisateur", async () => {
      await service.getCurrentUser();
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="div" gutterBottom>
        Démonstration du Cache Utilisateur
      </Typography>

      <Typography variant="body1" component="div" paragraph>
        Cette démo montre l'efficacité du cache utilisateur. La première requête
        utilisera l'API, tandis que les suivantes utiliseront le cache en
        mémoire, ce qui est beaucoup plus rapide.
      </Typography>

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" component="div" gutterBottom>
          Utilisateur Courant
        </Typography>

        {currentUser ? (
          <Box>
            <Typography variant="body1" component="div">
              <strong>ID:</strong> {currentUser.id}
            </Typography>
            <Typography variant="body1" component="div">
              <strong>Nom:</strong> {currentUser.first_name}{" "}
              {currentUser.last_name}
            </Typography>
            <Typography variant="body1" component="div">
              <strong>Nom d'utilisateur:</strong> {currentUser.username}
            </Typography>
            <Typography variant="body1" component="div">
              <strong>Email:</strong> {currentUser.email || "Non disponible"}
            </Typography>
            <Typography variant="body1" component="div">
              <strong>Rôles:</strong> {currentUser.roles || "Non disponible"}
            </Typography>
          </Box>
        ) : (
          <Typography color="text.secondary" component="div">
            Aucun utilisateur chargé
          </Typography>
        )}
      </Paper>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={getUser}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Obtenir Utilisateur"}
        </Button>

        <Button
          variant="outlined"
          color="warning"
          onClick={clearUserCache}
          disabled={loading}
        >
          Vider le Cache
        </Button>
      </Box>

      {message && (
        <Alert
          severity={message.includes("Erreur") ? "error" : "success"}
          sx={{ mb: 3 }}
        >
          {message}
        </Alert>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom component="div">
        Mesures de Performance
      </Typography>

      {timings.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell align="right">Temps (ms)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timings.map((timing, index) => (
                <TableRow key={index}>
                  <TableCell>{timing.action}</TableCell>
                  <TableCell align="right">{timing.time.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary" component="div">
          Aucune mesure de performance disponible. Exécutez quelques actions
          pour voir les résultats.
        </Typography>
      )}

      <Typography
        variant="body2"
        color="text.secondary"
        component="div"
        sx={{ mt: 2 }}
      >
        Note: Les temps peuvent varier en fonction de la connexion réseau, des
        performances du serveur et d'autres facteurs. Les appels utilisant le
        cache devraient être considérablement plus rapides que ceux faisant
        appel à l'API.
      </Typography>
    </Box>
  );
};

export default UserCacheDemo;
