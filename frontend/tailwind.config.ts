import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        surface: 'var(--surface)',
        'surface-muted': 'var(--surface-muted)',
        bg: 'var(--bg)',
        'nav-bg': 'var(--nav-bg)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        'accent-deep': 'var(--accent-deep)',
        
        // legacy apple colors for backward compatibility during transition
        apple: {
          bg: 'var(--bg)',
          primary: 'var(--accent)',
          text: 'var(--ink)',
          secondary: 'var(--ink-soft)',
          card: 'var(--surface)',
          border: 'var(--line)',
          green: '#34C759',
          orange: '#FF9500',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Manrope', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'pill': 'var(--radius-pill)',
        'lg': 'var(--radius-lg)',
        'md': 'var(--radius-md)',
        'sm': 'var(--radius-sm)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config
