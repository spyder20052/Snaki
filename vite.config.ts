import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Les exports iPhone arrivent en .PNG : sans ca Vite tente de les parser
  // comme du JavaScript et l'application ne demarre plus.
  assetsInclude: ['**/*.PNG', '**/*.JPG', '**/*.JPEG', '**/*.WEBP'],
})
