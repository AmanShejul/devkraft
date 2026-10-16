import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        muted: "var(--muted)",
        canvas: "var(--canvas)",
        brand: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-dark)",
          soft: "var(--brand-soft)",
        },
        sun: "var(--sun)",
      },
      boxShadow: { card: "none" },
      fontFamily: { sans: ["var(--font-manrope)", "Arial", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;
