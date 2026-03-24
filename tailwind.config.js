/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF8F4',
          100: '#FAEEE3',
          200: '#F3D5B8',
          300: '#E8B88A',
          400: '#C8956C',
          500: '#A87B52',
          600: '#8B6543',
          700: '#6E4F34',
          800: '#513A27',
          900: '#34261A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
