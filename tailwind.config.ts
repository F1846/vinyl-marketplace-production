import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#f4f3ef",
        surface: "#ffffff",
        "surface-hover": "#f1f0ec",
        border: "#dbd8d0",
        foreground: "#171717",
        muted: "#6f6c66",
        accent: "#1f1f1f",
        "accent-hover": "#353535",
        "accent-dark": "#0f0f0f",
        danger: "#b42318",
        success: "#157347",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      boxShadow: {
        soft: "0 18px 44px rgba(15, 15, 15, 0.08)",
        card: "0 12px 30px rgba(17, 17, 17, 0.07)",
      },
    },
  },
  plugins: [],
} satisfies Config;
