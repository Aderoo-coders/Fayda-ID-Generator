import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#4b3ef0",
        dark: "#0c1230",
        primary: { DEFAULT: "#4b3ef0", foreground: "#ffffff" },
        destructive: { DEFAULT: "#dc2626", foreground: "#ffffff" },
        muted: { DEFAULT: "#f1f5f9", foreground: "#64748b" },
        warning: "#d97706",
        success: "#16a34a"
      }
    }
  },
  plugins: []
};

export default config;
