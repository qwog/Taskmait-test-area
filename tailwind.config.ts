import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214.3 31.8% 91.4%)",
        background: "hsl(0 0% 100%)",
        muted: "hsl(210 40% 96.1%)",
        primary: "hsl(222.2 47.4% 11.2%)"
      }
    }
  },
  plugins: []
};

export default config;
