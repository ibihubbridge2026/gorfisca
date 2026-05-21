/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Financial Sanctuary Color Palette
        primary: '#006947',
        'on-primary': '#ffffff',
        'primary-container': '#00855b',
        'on-primary-container': '#f5fff6',
        'primary-fixed': '#8bf8c3',
        'on-primary-fixed': '#002113',
        'primary-fixed-dim': '#6fdba8',
        'on-primary-fixed-variant': '#005236',
        
        secondary: '#006a6a',
        'on-secondary': '#ffffff',
        'secondary-container': '#90efef',
        'on-secondary-container': '#006e6e',
        'secondary-fixed': '#93f2f2',
        'on-secondary-fixed': '#002020',
        'secondary-fixed-dim': '#76d6d5',
        'on-secondary-fixed-variant': '#004f4f',
        
        tertiary: '#765700',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#956e00',
        'on-tertiary-container': '#fffbff',
        'tertiary-fixed': '#ffdfa0',
        'on-tertiary-fixed': '#261a00',
        'tertiary-fixed-dim': '#fbbc00',
        'on-tertiary-fixed-variant': '#5c4300',
        
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        
        // Surface Colors (No-Line Rule)
        surface: '#f9f9fb',
        'on-surface': '#1a1c1d',
        'surface-variant': '#e2e2e4',
        'on-surface-variant': '#3e4942',
        'background': '#f9f9fb',
        'on-background': '#1a1c1d',
        outline: '#6e7a72',
        'outline-variant': '#bdcac0',
        
        'surface-dim': '#d9dadc',
        'surface-bright': '#f9f9fb',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f5',
        'surface-container': '#eeeef0',
        'surface-container-high': '#e8e8ea',
        'surface-container-highest': '#e2e2e4',
        
        'inverse-surface': '#2f3132',
        'inverse-on-surface': '#f0f0f2',
        'inverse-primary': '#6fdba8',
        'surface-tint': '#006c49',
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.04)',
        'glass-lg': '0 20px 50px rgba(0, 0, 0, 0.04)',
        'primary': '0 4px 14px rgba(0, 105, 71, 0.15)',
        'primary-lg': '0 8px 24px rgba(0, 105, 71, 0.20)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
