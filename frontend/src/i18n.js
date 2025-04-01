// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

i18n
  // Chargement des traductions depuis /public/locales/{lng}/translation.json
  .use(Backend)
  // Détection de la langue du navigateur
  .use(LanguageDetector)
  // Intégration avec React
  .use(initReactI18next)
  // Configuration
  .init({
    fallbackLng: "en",
    supportedLngs: ["fr", "en"],
    debug: process.env.NODE_ENV === "development",
    interpolation: {
      escapeValue: false, // non nécessaire avec React car il échappe déjà
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
  });

export default i18n;
