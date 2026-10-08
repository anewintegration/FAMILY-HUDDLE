/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // "sage" token now carries the teal accent (progress / completion)
        sage: {
          DEFAULT: '#00C2A8',
          light: '#5FE0CC',
          dark: '#00806E',
        },
        // "terracotta" token now carries the coral accent (the one signature color)
        terracotta: {
          DEFAULT: '#FF5A36',
          light: '#FF8B6B',
          dark: '#D8451F',
        },
        cream: {
          DEFAULT: '#FAFAF7',
          card: 'rgba(255, 255, 255, 0.97)',
          border: '#EEEDE8',
        },
        // "charcoal" token now carries deep indigo - structure and text
        charcoal: {
          DEFAULT: '#1B2340',
          muted: '#6B6F7A',
          faint: '#9599A6',
        },
        gold: {
          DEFAULT: '#FFB238',
          light: '#FFCB74',
          dark: '#A56A00',
        },
        category: {
          sports: '#4C86A8',
          health: '#D8451F',
          school: '#A56A00',
          friends: '#00806E',
          family: '#8B6F47',
          work: '#5C6F7D',
          personal: '#A8768F',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
}
