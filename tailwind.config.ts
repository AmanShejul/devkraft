import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f5f5f5",
        muted: "#8f8f8f",
        canvas: "#000000",
        brand: { DEFAULT: "#ffffff", dark: "#ffffff", soft: "#1b1b1b" },
        sun: "#c4c4c4",
      },
      boxShadow: { card: "none" },
      fontFamily: { sans: ["var(--font-manrope)", "Arial", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;
