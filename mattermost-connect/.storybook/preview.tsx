import React from "react";
import type { Preview } from "@storybook/react";
import { MattermostThemeProvider } from "../src/theme";
import { CssBaseline } from "@mui/material";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#F4F7F9" },
        { name: "dark", value: "#333333" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <MattermostThemeProvider>
        <CssBaseline />
        <Story />
      </MattermostThemeProvider>
    ),
  ],
};

export default preview;
