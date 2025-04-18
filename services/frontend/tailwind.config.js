/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {}
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.text-desktop': {
          '@apply font-bold text-[16px] text-error-red': {}
        }
      })
    }
  ]
}
