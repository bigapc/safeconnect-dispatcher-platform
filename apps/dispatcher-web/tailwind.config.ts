import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        card: 'var(--card)',
        border: 'var(--border)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        danger: 'var(--danger)',
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        glow: '0 0 0 2px rgba(12, 165, 130, 0.18), 0 18px 38px rgba(8, 18, 29, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
