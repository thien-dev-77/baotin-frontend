import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#171717",
        "primary-dark": "#171717",
        brand: {
          DEFAULT: "#FFC400",
          hover: "#E5B000"
        },
        section: "#FAFAF7",
        text: {
          strong: "#171717",
          secondary: "#525252",
          muted: "#737373"
        },
        border: "#E5E5E5",
        success: "#168A5A",
        danger: "#D92D20"
      },
      boxShadow: {
        card: "0 2px 10px rgba(23, 23, 23, 0.06)",
        "card-hover": "0 8px 24px rgba(23, 23, 23, 0.10)"
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
