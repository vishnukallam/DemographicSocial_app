import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-container': 'var(--color-primary-container)',
        'on-primary': 'var(--color-on-primary)',
        'on-primary-container': 'var(--color-on-primary-container)',

        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        error: 'var(--color-error)',

        'background-light': 'var(--color-background-light)',
        'background-dark': 'var(--color-background-dark)',

        surface: 'var(--color-surface)',
        'surface-dark': 'var(--color-surface-dark)',
        'surface-light': 'var(--color-surface-light)',

        'surface-container': 'var(--color-surface-container)',
        'surface-container-dark': 'var(--color-surface-container-dark)',
        'surface-container-light': 'var(--color-surface-container-light)',

        'on-surface': 'var(--color-on-surface)',
        'on-surface-dark': 'var(--color-on-surface-dark)',
        'on-surface-light': 'var(--color-on-surface-light)',

        outline: 'var(--color-outline)',
        'outline-dark': 'var(--color-outline-dark)',
        'outline-light': 'var(--color-outline-light)',

        // Specific hardcoded colors from designs ensuring they exist
        'card-light': '#FFFFFF',
        'card-dark': '#1A1A1A',
      },
      fontFamily: {
        display: ['"Be Vietnam Pro"', '"Google Sans"', 'sans-serif'],
        body: ['"Noto Sans"', 'Inter', 'Roboto', 'sans-serif'],
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'card': '28px',
        'input': '12px',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        // Squircle design system
        'sq-xs': '8px',
        'sq-sm': '12px',
        'sq-md': '16px',
        'sq-lg': '20px',
        'sq-xl': '24px',
        'sq-2xl': '28px',
      },
      boxShadow: {
        'elevation-1': '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 20px rgba(242, 13, 51, 0.3)',
      }
    },
  },
  plugins: [
    forms,
    typography,
    containerQueries,
  ],
}
