# Configuration de l'application démo

Pour résoudre l'erreur de résolution de module avec Vite, suivez ces étapes :

## 1. Mettre à jour les fichiers de configuration

Assurez-vous que votre structure de dossiers est la suivante :
- `mattermost-connect/` (dossier racine)
    - `dist/` (dossier généré par le build)
    - `examples/demo/` (application démo)

## 2. Construire la bibliothèque principale

Avant de lancer l'application démo, vous devez construire la bibliothèque principale :

```bash
# À la racine du projet
pnpm run build
```

Cela générera les fichiers dans le dossier `dist/`.

## 3. Configurer le dossier de la démo

Créez ou mettez à jour les fichiers suivants dans le dossier `examples/demo/` :

### vite.config.js

Assurez-vous que ce fichier contient la configuration d'alias correcte :

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'mattermost-connect': path.resolve(__dirname, '../../dist/index.esm.js'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
```

### package.json

Vérifiez que le package.json de la démo a toutes les dépendances requises :

```json
{
  "name": "mattermost-connect-demo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.14.18",
    "@mui/material": "^5.14.18",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.5.9",
    "@types/react": "^18.2.21",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.10"
  }
}
```

## 4. Installer les dépendances de la démo

```bash
cd examples/demo
pnpm install
```

## 5. Workflow de développement

Pour un workflow de développement efficace, utilisez deux terminaux :

**Terminal 1 (bibliothèque principale)** :
```bash
# À la racine du projet
pnpm run dev
```

**Terminal 2 (application démo)** :
```bash
# Dans examples/demo
pnpm start
```

Cette configuration permettra de recharger automatiquement l'application démo lorsque vous modifiez le code de la bibliothèque principale.

## Dépannage

Si vous rencontrez toujours des problèmes :

1. Vérifiez que le build a bien généré le fichier `dist/index.esm.js`
2. Assurez-vous que le chemin relatif dans `vite.config.js` est correct
3. Essayez d'utiliser un chemin absolu dans la configuration d'alias
4. Vérifiez les importations dans vos fichiers React

Avec cette configuration, l'erreur `Failed to resolve entry for package "mattermost-connect"` devrait être résolue.