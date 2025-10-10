import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  const commonHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  
  return {
    plugins: [
      react({
        jsxRuntime: isProduction ? 'classic' : 'automatic',
      })
    ],
    resolve: {
      extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
      cors: true,
      hmr: !isProduction,
      headers: commonHeaders,
    },
    preview: {
      port: 3000,
      headers: commonHeaders,
    },
    build: {
      sourcemap: false,
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        format: {
          comments: false,
        },
      } : undefined,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            vendor: ['framer-motion', 'lucide-react'],
          },
        },
      },
    },
    customLogger: isProduction ? {
      info: () => {},
      warn: () => {},
      error: () => {},
    } : undefined,
  };
});
