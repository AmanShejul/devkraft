import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172c35",
        muted: "#687b82",
        canvas: "#f5f8f6",
        brand: { DEFAULT: "#177c68", dark: "#0e5e50", soft: "#e5f4ef" },
        sun: "#f0b84a",
      },
      boxShadow: { card: "0 14px 42px rgba(23, 44, 53, 0.06)" },
      fontFamily: { sans: ["var(--font-manrope)", "Arial", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;
