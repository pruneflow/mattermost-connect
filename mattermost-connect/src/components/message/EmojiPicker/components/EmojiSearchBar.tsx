import { InputBase, InputAdornment, IconButton, Box } from "@mui/material";
import { Search as SearchIcon, Close as CloseIcon } from "@mui/icons-material";

interface EmojiSearchBarProps {
  /** Index de l'onglet actif */
  activeTab: number;
  /** Valeur de la recherche */
  searchQuery: string;
  /** Fonction pour mettre à jour la recherche */
  setSearchQuery: (query: string) => void;
  /** Fonction pour effacer la recherche */
  clearSearch: () => void;
}

export const EmojiSearchBar: React.FC<EmojiSearchBarProps> = ({
  activeTab,
  searchQuery,
  setSearchQuery,
  clearSearch,
}) => {
  return (
    <Box sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: "divider" }}>
      <InputBase
        placeholder={
          activeTab === 0 ? "Rechercher un emoji..." : "Rechercher un GIF..."
        }
        fullWidth
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon
              fontSize="small"
              sx={{ color: "text.secondary", mr: 0.5 }}
            />
          </InputAdornment>
        }
        endAdornment={
          searchQuery && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={clearSearch}
                edge="end"
                sx={{ p: 0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }
        sx={{
          fontSize: "0.875rem",
          px: 1,
          py: 0.25,
          borderRadius: 1,
          bgcolor: "action.hover",
        }}
      />
    </Box>
  );
};
