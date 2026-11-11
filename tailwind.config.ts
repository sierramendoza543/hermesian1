import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#966c6b',
        secondary: '#cb9c9a',
        accent: '#ffe5d6',
        ink: '#1c1620',
        paper: '#fbf7f3',
        line: '#eadfd6',
        muted: '#6b6270',
        lean: {
          left: '#1d4ed8',
          'lean-left': '#60a5fa',
          center: '#8b8b99',
          'lean-right': '#f97316',
          right: '#b91c1c',
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-merriweather)', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,22,32,0.04), 0 8px 24px -12px rgba(28,22,32,0.12)',
        lift: '0 2px 4px rgba(28,22,32,0.06), 0 16px 32px -12px rgba(28,22,32,0.22)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        rise: 'rise 0.45s ease-out both',
        pop: 'pop 0.25s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
