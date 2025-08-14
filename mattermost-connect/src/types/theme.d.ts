import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    userMessage: {
      main: string;
      border: string;
      hover: string;
      text: string;
      link: string;
    };
  }

  interface PaletteOptions {
    userMessage?: {
      main?: string;
      border?: string;
      hover?: string;
      text?: string;
      link?: string;
    };
  }
}