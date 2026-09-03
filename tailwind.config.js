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
        sage: {
          DEFAULT: '#7C9473',
          light: '#A8BC9F',
          dark: '#5E7256',
        },
        terracotta: {
          DEFAULT: '#C97B5C',
          light: '#E0A588',
          dark: '#A85E42',
        },
        cream: {
          // dark tan page background (final version from design review)
          DEFAULT: '#D8CBA8',
          card: '#DCE3D3', // sage-mist card background
          border: '#C7CFBB',
        },
        charcoal: {
          DEFAULT: '#3D3D3A',
          muted: '#7A7568',
          faint: '#9A9484',
        },
        gold: {
          DEFAULT: '#D4A24C',
          light: '#E5C079',
          dark: '#A87C31',
        },
        category: {
          sports: '#4C86A8',
          health: '#A85E42',
          school: '#A87C31',
          friends: '#5E7256',
          family: '#8B6F47',
          work: '#5C6F7D',
          personal: '#A8768F',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
