import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#4b3ef0",
        dark: "#0c1230"
      }
    }
  },
  plugins: []
};

export default config;
