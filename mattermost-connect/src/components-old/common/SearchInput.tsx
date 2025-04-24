import {
  Box,
  IconButton,
  InputAdornment,
  InputBase,
  InputBaseProps,
  SxProps,
  Theme,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";

interface SearchInputProps extends Omit<InputBaseProps, "onChange"> {
  /** Valeur actuelle de la recherche */
  value: string;
  /** Fonction appelée lors de la modification de la valeur */
  onChange: (value: string) => void;
  /** Placeholder à afficher */
  placeholder?: string;
  /** Si le bouton de filtre doit être affiché */
  showFilter?: boolean;
  /** Si le champ est désactivé */
  disabled?: boolean;
  /** Fonction appelée lorsqu'on clique sur le bouton de filtre */
  onFilterClick?: () => void;
  /** Styles personnalisés */
  sx?: SxProps<Theme>;
  /** Styles pour l'icône de recherche */
  searchIconSx?: SxProps<Theme>;
  /** Styles pour l'icône de nettoyage */
  clearIconSx?: SxProps<Theme>;
  /** Styles pour l'icône de filtre */
  filterIconSx?: SxProps<Theme>;
  /** Délai en ms avant d'appeler onChange (debounce) */
  debounceTime?: number;
}

/**
 * Champ de recherche avec fonctionnalités de filtrage et debounce
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  showFilter = false,
  disabled = false,
  onFilterClick,
  sx,
  searchIconSx,
  clearIconSx,
  filterIconSx,
  debounceTime = 300,
  ...rest
}) => {
  // État local pour gérer la saisie avec debounce
  const [localValue, setLocalValue] = useState(value);

  // Référence pour le timer de debounce
  const debounceTimerRef = useRef<number | null>(null);

  // Mettre à jour la valeur locale lorsque la prop value change
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Gérer le changement de valeur avec debounce
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Nettoyer le timer précédent
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // Définir un nouveau timer
    debounceTimerRef.current = window.setTimeout(() => {
      onChange(newValue);
      debounceTimerRef.current = null;
    }, debounceTime);
  };

  // Nettoyer le timer lors du démontage
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Effacer la recherche
  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <InputBase
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      fullWidth
      {...rest}
      startAdornment={
        <InputAdornment position="start">
          <SearchIcon
            fontSize="small"
            sx={{
              color: "text.secondary",
              ...searchIconSx,
            }}
          />
        </InputAdornment>
      }
      endAdornment={
        <Box display="flex" alignItems="center">
          {localValue && (
            <Tooltip title="Clear search">
              <IconButton
                size="small"
                onClick={handleClear}
                sx={{
                  p: 0.5,
                  ...clearIconSx,
                }}
                disabled={disabled}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {showFilter && (
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={onFilterClick}
                sx={{
                  ml: 0.5,
                  p: 0.5,
                  ...filterIconSx,
                }}
                disabled={disabled}
              >
                <FilterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      }
      sx={{
        px: 1.5,
        py: 0.75,
        bgcolor: "action.hover",
        borderRadius: 2,
        transition: (theme) =>
          theme.transitions.create(["background-color", "box-shadow"]),
        "&:hover": {
          bgcolor: "action.selected",
        },
        "&.Mui-focused": {
          bgcolor: "background.paper",
          boxShadow: (theme) => theme.shadows[1],
        },
        ...sx,
      }}
    />
  );
};
