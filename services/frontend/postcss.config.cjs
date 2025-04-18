'use strict'

const { resolve } = require('node:path')
module.exports = {
  plugins: {
    tailwindcss: {
      config: resolve(__dirname, './node_modules/@platformatic/ui-components/tailwind.config.cjs')
    },
    autoprefixer: {}
  }
}
