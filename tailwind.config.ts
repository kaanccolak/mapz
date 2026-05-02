import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        gezle: {
          hero: '#0a0a0f',
          primary: '#1d9e75',
          primaryLight: '#5dcaa5',
          surface: '#ffffff',
          surfaceMuted: '#f8f8f7',
          text: '#0a0a0f',
          muted: '#6b7280',
          border: '#e5e7eb',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
