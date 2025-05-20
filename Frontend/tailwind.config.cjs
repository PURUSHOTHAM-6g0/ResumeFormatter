// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // support all src files
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/Pages/**/*.{js,ts,jsx,tsx}"

  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6', // consistent 'primary' color
      },
    },
  },
  plugins: [],
};
