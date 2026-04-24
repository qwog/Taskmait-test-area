import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Field-mode palette — high contrast only, no subtle grays.
        go: { DEFAULT: "#16a34a", fg: "#ffffff" },
        caution: { DEFAULT: "#facc15", fg: "#000000" },
        stop: { DEFAULT: "#dc2626", fg: "#ffffff" },
      },
      fontSize: {
        // Field-mode minimums.
        "field-body": ["1.125rem", { lineHeight: "1.5rem" }], // 18px
        "field-action": ["1.5rem", { lineHeight: "2rem" }], // 24px
        "field-hero": ["3rem", { lineHeight: "1" }], // 48px
        "field-mega": ["4.5rem", { lineHeight: "1" }], // 72px
      },
      minHeight: {
        "tap-min": "64px",
        "tap-primary": "80px",
        "field-btn": "120px",
      },
      transitionDuration: { instant: "0ms", fast: "150ms" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
