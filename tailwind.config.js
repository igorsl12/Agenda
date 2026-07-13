/** @type {import('tailwindcss').Config} */
// tailwind.config.js — tokens de design estilo Apple / minimalista.
// darkMode 'class' + variáveis CSS permitem tema claro/escuro alternando a
// classe `dark` no container raiz (ver ThemeProvider / App.tsx). As cores são
// resolvidas por variáveis CSS definidas em global.css, então `bg-canvas`,
// `text-ink`, `bg-surface`, etc. mudam automaticamente com o tema.
module.exports = {
  presets: [require('nativewind/preset')],
  // nativewind exige declarar as extensões que contêm classes Tailwind.
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens semânticos resolvidos por variáveis CSS (veja global.css).
        // `surface` = cartões/folhas; os demais espelham a paleta iOS.
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        hairline: 'rgb(var(--color-hairline) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        // San Francisco cai automaticamente no iOS; fallback genérico em outras plataformas.
        sans: ['-apple-system', 'SF Pro Text', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        // Sombra suave e leve para cartões flutuantes.
        card: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
        fab: '0 8px 24px rgba(0,113,227,0.35)',
      },
    },
  },
  plugins: [],
};
