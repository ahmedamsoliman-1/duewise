import type { Config } from "tailwindcss";

const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens
        bg: withAlpha("--color-bg"),
        surface: withAlpha("--color-surface"),
        panel: withAlpha("--color-panel"),
        ink: withAlpha("--color-ink"),
        muted: withAlpha("--color-muted"),
        line: withAlpha("--color-line"),
        brand: {
          DEFAULT: withAlpha("--color-brand"),
          strong: withAlpha("--color-brand-strong"),
          soft: withAlpha("--color-brand-soft")
        },
        flame: withAlpha("--color-flame"),
        onyx: withAlpha("--color-onyx"),
        // Legacy aliases
        mist: withAlpha("--color-mist"),
        sage: withAlpha("--color-sage"),
        clay: withAlpha("--color-clay"),
        skyglass: withAlpha("--color-skyglass")
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      },
      boxShadow: {
        soft: "var(--shadow-card)",
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
        glow: "var(--shadow-glow)"
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, rgb(var(--color-flame)), rgb(var(--color-brand)))"
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        rise: "rise 0.4s cubic-bezier(0.22,1,0.36,1) both"
      }
    }
  },
  plugins: []
};

export default config;
