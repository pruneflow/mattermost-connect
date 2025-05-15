import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Typography,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import { VariableSizeList as VirtualList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Search as SearchIcon,
  EmojiEmotions as EmoticonIcon,
  AccessTime as RecentIcon,
  Favorite as FavoriteIcon,
  People as PeopleIcon,
  Pets as AnimalsIcon,
  LocalDining as FoodIcon,
  Commute as TravelIcon,
  SportsSoccer as ActivitiesIcon,
  Lightbulb as ObjectsIcon,
  Flag as FlagsIcon,
  EmojiSymbols as SymbolsIcon
} from '@mui/icons-material';

// Import des composants et utilitaires
import EmojiRow from './EmojiRow';
import { EMOJI_CATEGORIES, CATEGORY_DISPLAY_NAMES } from '../../utils/emojiMapping';
import { 
  EmojiData, 
  EMOJIS_BY_CATEGORY, 
  getRecentEmojis, 
  addToRecentEmojis,
  EMOJI_DATA_SAMPLE
} from '../../utils/emojiData';
import { preloadEmojiSpriteSheet, isSpriteSheetLoaded } from '../../utils/emojiCache';
import { EMOJI_SPRITE_URL } from '../../utils/emojiMapping';

// Constantes
const EMOJI_SIZE = 28; // Taille de chaque emoji
const EMOJIS_PER_ROW = 6; // Nombre d'émojis par ligne
const CATEGORY_HEADER_HEIGHT = 32; // Hauteur des en-têtes de catégorie
const EMOJI_ROW_HEIGHT = 36; // Hauteur d'une ligne d'émojis

// Définition des icônes pour chaque catégorie
const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  'recent': <RecentIcon />,
  'frequent': <FavoriteIcon />,
  'smileys-emotion': <EmoticonIcon />,
  'people-body': <PeopleIcon />,
  'animals-nature': <AnimalsIcon />,
  'food-drink': <FoodIcon />,
  'travel-places': <TravelIcon />,
  'activities': <ActivitiesIcon />,
  'objects': <ObjectsIcon />,
  'symbols': <SymbolsIcon />,
  'flags': <FlagsIcon />
};

// Props de l'EmojiPicker
export interface EmojiPickerProps {
  onEmojiSelect: (emoji: string, emojiName: string, unified?: string) => void;
  showCategoryTabs?: boolean;
  showSearchBar?: boolean;
  initialCategory?: string;
  height?: number;
  width?: number;
}

// EmojiRow est maintenant importé depuis un fichier séparé

// En-tête de catégorie (mémorisé)
const CategoryHeader = memo(({ 
  category 
}: { 
  category: string 
}) => {
  return (
    <Typography 
      variant="subtitle2" 
      sx={{ 
        px: 1, 
        py: 0.5, 
        fontWeight: 'bold',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}
    >
      {CATEGORY_DISPLAY_NAMES[category] || 
       category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </Typography>
  );
});

/**
 * Composant EmojiPicker optimisé utilisant le système de sprite sheet
 * Basé sur l'implémentation de Mattermost pour des performances optimales
 */
export function EmojiPickerMM({
  onEmojiSelect,
  showCategoryTabs = true,
  showSearchBar = true,
  initialCategory = 'smileys-emotion',
  height = 280,
  width = 222
}: EmojiPickerProps) {
  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmojiData[]>([]);
  
  // État pour les émojis récents
  const [recentEmojis, setRecentEmojis] = useState<EmojiData[]>([]);
  
  // État pour la catégorie active
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  
  // Refs
  const listRef = useRef<any>(null);
  const categoryPositionsRef = useRef<Record<string, number>>({});
  const isScrollingRef = useRef(false);
  
  // Chargement des émojis récents
  useEffect(() => {
    setRecentEmojis(getRecentEmojis());
  }, []);
  
  // Gestion de la sélection d'emoji
  const handleEmojiSelect = useCallback((emoji: string, name: string, unified: string) => {
    // Appeler le callback fourni
    onEmojiSelect(emoji, name, unified);
    
    // Ajouter aux émojis récents
    addToRecentEmojis(unified);
    
    // Mettre à jour l'état local des récents
    setRecentEmojis(getRecentEmojis());
  }, [onEmojiSelect]);
  
  // Calculer les sections d'émojis (toutes les catégories)
  const allEmojiSections = useMemo(() => {
    const sections: Array<{
      category: string;
      emojis: EmojiData[];
    }> = [];
    
    // Ajouter les émojis récents s'ils existent
    if (recentEmojis.length > 0) {
      sections.push({ category: 'recent', emojis: recentEmojis });
    }
    
    // Ajouter les autres catégories
    for (const category of EMOJI_CATEGORIES) {
      if (category === 'recent') continue;
      
      const emojis = EMOJIS_BY_CATEGORY[category] || [];
      
      // S'assurer qu'il y a au moins un emoji (même vide) pour chaque catégorie
      // Cela évite les erreurs lorsqu'une catégorie est vide
      if (emojis.length > 0) {
        sections.push({ category, emojis });
      }
    }
    
    // Si aucune section n'existe (ce qui ne devrait pas arriver), ajouter une section par défaut
    if (sections.length === 0) {
      sections.push({
        category: 'smileys-emotion',
        emojis: EMOJI_DATA_SAMPLE.length > 0 ? 
          EMOJI_DATA_SAMPLE.filter(e => e.category === 'smileys-emotion') : 
          [{
            name: "EMPTY",
            unified: "2B1C",
            short_name: "empty",
            short_names: ["empty"],
            sheet_x: 0,
            sheet_y: 0,
            category: "smileys-emotion"
          }]
      });
    }
    
    return sections;
  }, [recentEmojis]);
  
  // Calculer les données des lignes pour la liste virtualisée
  const rowData = useMemo(() => {
    const rows: Array<{
      type: 'header' | 'emojis';
      category: string;
      emojis?: EmojiData[];
      index: number;
    }> = [];
    
    let index = 0;
    
    // Préparer les positions des catégories pour la navigation
    const positions: Record<string, number> = {};
    
    allEmojiSections.forEach(({ category, emojis }) => {
      // Ajouter la position de l'en-tête
      positions[category] = index;
      
      // Ajouter l'en-tête
      rows.push({ type: 'header', category, index: index++ });
      
      // Ajouter les lignes d'émojis
      const rowCount = Math.ceil(emojis.length / EMOJIS_PER_ROW);
      for (let i = 0; i < rowCount; i++) {
        const startIdx = i * EMOJIS_PER_ROW;
        const rowEmojis = emojis.slice(startIdx, startIdx + EMOJIS_PER_ROW);
        rows.push({ type: 'emojis', emojis: rowEmojis, category, index: index++ });
      }
    });
    
    // Mettre à jour les positions des catégories
    categoryPositionsRef.current = positions;
    
    return rows;
  }, [allEmojiSections]);
  
  // Calculer les lignes de résultats de recherche
  const searchResultRows = useMemo(() => {
    const rows: Array<EmojiData[]> = [];
    
    for (let i = 0; i < searchResults.length; i += EMOJIS_PER_ROW) {
      rows.push(searchResults.slice(i, i + EMOJIS_PER_ROW));
    }
    
    return rows;
  }, [searchResults]);
  
  // Gérer le changement de catégorie
  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
    
    // Effacer la recherche si active
    if (searchQuery) {
      setSearchQuery('');
    }
    
    // Faire défiler jusqu'à la catégorie
    if (listRef.current && categoryPositionsRef.current[category] !== undefined) {
      isScrollingRef.current = true;
      listRef.current.scrollToItem(categoryPositionsRef.current[category], 'start');
      
      // Réinitialiser l'indicateur de défilement
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    }
  }, [searchQuery]);
  
  // Précharger le sprite sheet
  useEffect(() => {
    if (!isSpriteSheetLoaded()) {
      // Précharger le sprite directement
      preloadEmojiSpriteSheet(EMOJI_SPRITE_URL);
    }
  }, []);
  
  // Gérer la recherche d'émojis
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    try {
      // Recherche sécurisée (avec vérification des propriétés)
      const lowerQuery = query.toLowerCase();
      
      // S'assurer que EMOJI_DATA_SAMPLE existe et est un tableau
      const emojiData = Array.isArray(EMOJI_DATA_SAMPLE) ? EMOJI_DATA_SAMPLE : [];
      
      // Filtrer les résultats avec vérifications robustes
      const results = emojiData.filter(emoji => {
        if (!emoji) return false;
        
        // Vérifier chaque propriété avant utilisation
        const shortNameMatch = emoji.short_name && 
          typeof emoji.short_name === 'string' && 
          emoji.short_name.includes(lowerQuery);
        
        const shortNamesMatch = emoji.short_names && 
          Array.isArray(emoji.short_names) && 
          emoji.short_names.some(name => name && typeof name === 'string' && name.includes(lowerQuery));
        
        const nameMatch = emoji.name && 
          typeof emoji.name === 'string' && 
          emoji.name.toLowerCase().includes(lowerQuery);
        
        return shortNameMatch || shortNamesMatch || nameMatch;
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'émojis:', error);
      // En cas d'erreur, afficher un résultat vide plutôt que planter
      setSearchResults([]);
    }
  }, []);
  
  // Obtenir la hauteur des lignes
  const getRowHeight = useCallback((index: number) => {
    const row = rowData[index];
    if (!row) return EMOJI_ROW_HEIGHT;
    
    return row.type === 'header' ? CATEGORY_HEADER_HEIGHT : EMOJI_ROW_HEIGHT;
  }, [rowData]);
  
  // Mémoriser les onglets de catégorie
  const categoryTabs = useMemo(() => {
    // Obtenir les catégories disponibles
    const availableCategories = Object.keys(categoryPositionsRef.current);
    
    return (
      <Box 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          overflowX: 'auto',
          scrollbarWidth: 'thin'
        }}
      >
        {availableCategories.map(category => (
          <Tooltip key={category} title={CATEGORY_DISPLAY_NAMES[category] || category}>
            <IconButton
              onClick={() => handleCategoryChange(category)}
              color={activeCategory === category ? 'primary' : 'default'}
              sx={{ 
                borderRadius: 0,
                borderBottom: activeCategory === category ? 2 : 0,
                borderColor: 'primary.main',
                p: 0.5,
                minWidth: '24px',
                width: '24px',
                height: '24px',
                '& .MuiSvgIcon-root': {
                  fontSize: '1rem'
                }
              }}
            >
              {CATEGORY_ICONS[category] || <EmoticonIcon />}
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    );
  }, [activeCategory, handleCategoryChange]);
  
  // Rendre une ligne (mémorisée)
  const renderRow = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const row = rowData[index];
    if (!row) return null;
    
    if (row.type === 'header') {
      return (
        <div style={style}>
          <CategoryHeader category={row.category} />
        </div>
      );
    } else {
      // Ligne d'émojis
      return (
        <div style={style}>
          <EmojiRow 
            emojis={row.emojis || []} 
            onEmojiSelect={handleEmojiSelect} 
          />
        </div>
      );
    }
  }, [rowData, handleEmojiSelect]);
  
  // Composant des résultats de recherche (mémorisé)
  const searchResultsComponent = useMemo(() => {
    if (searchResults.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">Aucun emoji trouvé</Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="subtitle2" sx={{ px: 1, mb: 1, fontWeight: 'bold' }}>
          Résultats de recherche
        </Typography>
        
        {searchResultRows.map((row, rowIndex) => (
          <EmojiRow 
            key={`search-row-${rowIndex}`}
            emojis={row} 
            onEmojiSelect={handleEmojiSelect} 
          />
        ))}
      </Box>
    );
  }, [searchResults, searchResultRows, handleEmojiSelect]);
  
  // Rendu du composant principal
  return (
    <Paper 
      sx={{ 
        width, 
        height, 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column' 
      }}
    >
      {/* Barre de recherche */}
      {showSearchBar && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={handleSearchChange}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}
      
      {/* Onglets de catégorie */}
      {showCategoryTabs && !searchQuery && categoryTabs}
      
      {/* Contenu des émojis */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'hidden', 
          overflowX: 'hidden',
          position: 'relative'
        }}
      >
        {/* Afficher les résultats de recherche si recherche active */}
        {searchQuery ? (
          <Box 
            sx={{ 
              height: '100%',
              overflowY: 'auto',
              scrollbarWidth: 'thin'
            }}
          >
            {searchResultsComponent}
          </Box>
        ) : (
          /* Afficher la liste complète des catégories */
          <AutoSizer>
            {({ width: containerWidth, height: containerHeight }) => (
              <VirtualList
                ref={listRef}
                width={containerWidth}
                height={containerHeight}
                itemCount={rowData.length}
                itemSize={getRowHeight}
                overscanCount={10}
                initialScrollOffset={
                  // Si une catégorie spécifique est demandée, défiler jusqu'à elle
                  activeCategory && categoryPositionsRef.current[activeCategory] 
                    ? categoryPositionsRef.current[activeCategory] * EMOJI_ROW_HEIGHT 
                    : 0
                }
                style={{ 
                  scrollbarWidth: 'thin'
                }}
              >
                {renderRow}
              </VirtualList>
            )}
          </AutoSizer>
        )}
      </Box>
    </Paper>
  );
}

export default EmojiPickerMM;