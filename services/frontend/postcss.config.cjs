'use strict'

const { resolve } = require('node:path')
module.exports = {
  plugins: {
    tailwindcss: {
      config: resolve(__dirname, 'tailwind.config.js')
    },
    autoprefixer: {}
  }
}
