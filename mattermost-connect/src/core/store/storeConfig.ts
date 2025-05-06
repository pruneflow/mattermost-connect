// src/core/store/storeConfig.ts
import { enableMapSet } from "immer";

// Activer l'extension MapSet d'immer
enableMapSet();

// Exporter d'autres configurations si nécessaire
export const storeConfig = {
  initialized: true,
};

export default storeConfig;
