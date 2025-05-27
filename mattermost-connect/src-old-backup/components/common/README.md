# Composants d'émojis avec sprite sheet

Cette implémentation utilise l'approche de Mattermost pour les émojis, basée sur une sprite sheet et des classes CSS.

## Fichiers principaux

- `EmojiCss.tsx` : Composant qui affiche un emoji en utilisant les classes CSS de Mattermost
- `EmojiRow.tsx` : Composant qui affiche une ligne d'émojis dans le picker
- `EmojiPickerMM.tsx` : Picker d'émojis complet utilisant les classes CSS de Mattermost

## Styles et assets

- `/assets/sprite_mm.gif` : Sprite sheet contenant tous les émojis
- `/assets/emoji-sprites/emoji-styles.css` : Fichier CSS généré contenant toutes les positions d'émojis
- `/assets/emoji-sprites/emoji-parser.js` : Script pour extraire les positions depuis le fichier SCSS

## Principe de fonctionnement

1. Chaque emoji a une classe CSS correspondant à son code unifié (ex: `.emoji-1f600`)
2. Cette classe définit la position dans le sprite sheet (background-position)
3. L'image sprite_mm.gif est utilisée comme image d'arrière-plan
4. Pour les réactions sous les messages, on utilise l'API Mattermost pour récupérer des images individuelles

## Comment l'utiliser

Pour ajouter un emoji dans l'interface:

```jsx
<EmojiCss 
  unified="1f600" 
  shortName="grinning" 
  category="smileys-emotion"
  size={28} // optionnel
  onSelect={(unified, shortName) => {
    // Action à effectuer lors de la sélection
  }}
/>
```