import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Les exports iPhone arrivent en .PNG : sans ca Vite tente de les parser
  // comme du JavaScript et l'application ne demarre plus.
  assetsInclude: ['**/*.PNG', '**/*.JPG', '**/*.JPEG', '**/*.WEBP'],
  esbuild: {
    // Le code livre au navigateur est toujours lisible : on ne peut pas
    // l'empecher. On limite en revanche ce qu'il RACONTE -- les console.*
    // laissaient filtrer la logique interne et des valeurs de debogage
    // dans la console de n'importe quel visiteur.
    drop: ['console', 'debugger'],
  },
  build: {
    // Pas de sourcemap en production : elle reconstituerait le code source
    // d'origine, commentaires compris, a partir du bundle minifie.
    sourcemap: false,
  },
})
