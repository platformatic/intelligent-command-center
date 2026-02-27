import uiComponentsConfig from '@platformatic/ui-components/tailwind.config.cjs'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [uiComponentsConfig],
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
