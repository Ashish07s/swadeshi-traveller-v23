import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
        display: ["Barlow Condensed", "Poppins", "system-ui", "sans-serif"],
      },
      colors: {
        brand: "#00C46C",
        "brand-dark": "#004A36",
        "brand-light": "#e6f9f0",
        border: "#E2E8F0",
        background: "#F8FAFC",
        foreground: "#0f172a",
      },
    },
  },
  plugins: [],
};
export default config;