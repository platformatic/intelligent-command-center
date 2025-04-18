import { join, resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const envDir = join(__dirname, '..', '..')

// https://vitejs.dev/config/
export default defineConfig({
  envDir,
  plugins: [react()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src')
    }
  },
  build: {
    sourcemap: true
  },
  server: {
    host: process.env.DEV_K8S === 'true' ? '0.0.0.0' : 'localhost',
    allowedHosts: ['frontend.plt.local']
  }
})
