import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        mist: "rgb(var(--color-mist) / <alpha-value>)",
        sage: "rgb(var(--color-sage) / <alpha-value>)",
        clay: "rgb(var(--color-clay) / <alpha-value>)",
        skyglass: "rgb(var(--color-skyglass) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 28, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
