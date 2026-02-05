import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // To include specific polyfills, add them to this list.
      // If not provided, all polyfills will be included.
      include: ['path', 'stream', 'util', 'process', 'buffer', 'events', 'string_decoder', 'http', 'https', 'os', 'url', 'zlib', 'punycode'],
      
      // Whether to polyfill `global` (window.global).
      // Defaults to `true`.
      globals: {
        Buffer: true,
        global: true,
      },
      // Whether to polyfill `node:` protocol imports.
      // Defaults to `true`.
      protocolImports: true,
    }),
    // visualizer({
    //     open: false,
    //     gzipSize: true, 
    //     brotliSize: true,
    //     filename: 'stats.html'
    // }),
  ],
  build: {
    target: 'esnext',
    sourcemap: false, // ✅ Save memory during build
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-wagmi': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'styled-components'], 
        }
      }
    }
  },
})
