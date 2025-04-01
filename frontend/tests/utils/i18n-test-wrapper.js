// tests/utils/i18n-test-wrapper.js
import React from "react";
import { render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import frTranslation from "../../public/locales/fr/translation.json";
import { AuthProvider } from "../../src/contexts/AuthContext.jsx";

// Configuration i18n spécifique aux tests
i18n.use(initReactI18next).init({
  lng: "fr",
  fallbackLng: "fr",
  ns: ["translation"],
  defaultNS: "translation",
  resources: {
    fr: {
      translation: frTranslation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false, // Important pour les tests
  },
});

function AllTheProviders({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>{children}</AuthProvider>
    </I18nextProvider>
  );
}

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from "@testing-library/react";

// override render method
export { customRender as render };
