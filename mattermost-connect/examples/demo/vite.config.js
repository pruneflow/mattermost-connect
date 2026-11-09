// examples/demo/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(process.env.VITE_HTTPS === 'true' ? [basicSsl()] : [])
  ],
  resolve: {
    alias: {
      // Aliasing pour la bibliothèque locale en développement
      "mattermost-connect": path.resolve(__dirname, "../../dist/index.esm.js"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
