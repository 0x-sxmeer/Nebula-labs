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
  server: {
    proxy: {
      '/api/rpc-proxy': {
        target: 'https://rpc.ankr.com', // Fallback target
        changeOrigin: true,
        rewrite: (path) => {
          const chain = new URLSearchParams(path.split('?')[1]).get('chain');
          // Add logic to route to different providers based on chain if needed
          return ''; // This is a mock proxy setup - likely needs a real backend function
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
             // Basic forwarding logic
          });
        }
      },
      // ✅ Li.Fi API Proxy (Hardened)
      '/lifi-proxy': {
        target: 'https://li.quest/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lifi-proxy/, ''),
        secure: true, 
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            // Spoof User-Agent and Origin to look like a direct request
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            proxyReq.removeHeader('Origin');
          });
          
          proxy.on('proxyRes', (proxyRes, req, _res) => {
             // Force CORS headers on response
             proxyRes.headers['Access-Control-Allow-Origin'] = '*';
             proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, PATCH, DELETE';
             proxyRes.headers['Access-Control-Allow-Headers'] = 'X-Requested-With,content-type';
             console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
        }
      }
    }
  },
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
