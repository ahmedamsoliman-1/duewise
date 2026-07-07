import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201c",
        mist: "#f4f7f4",
        sage: "#49685a",
        clay: "#a65f3d",
        skyglass: "#dbe9ee"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 28, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
