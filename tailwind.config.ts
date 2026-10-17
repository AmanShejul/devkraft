import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        muted: "var(--muted)",
        canvas: "var(--canvas)",
        panel: "var(--panel)",
        "panel-raised": "var(--panel-raised)",
        line: "var(--line)",
        brand: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-dark)",
          soft: "var(--brand-soft)",
        },
        sun: "var(--sun)",
      },
      boxShadow: { card: "none" },
      fontFamily: {
        sans: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"],
        display: ["var(--font-display)", "var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
