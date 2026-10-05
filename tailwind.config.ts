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
        primary: "#0F3157",
        "primary-dark": "#08233F",
        blue: {
          brand: "#1677D2",
          hover: "#0E65B8"
        },
        section: "#F5F8FC",
        "section-blue": "#F0F6FD",
        text: {
          strong: "#102A43",
          secondary: "#52667A",
          muted: "#7B8A9A"
        },
        border: "#E2E8F0",
        success: "#168A5A",
        danger: "#D92D20"
      },
      boxShadow: {
        card: "0 2px 10px rgba(15, 49, 87, 0.06)",
        "card-hover": "0 8px 24px rgba(15, 49, 87, 0.10)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
