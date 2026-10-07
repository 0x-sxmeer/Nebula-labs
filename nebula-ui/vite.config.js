import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// UI-only build: web3 libs (wagmi/viem/rainbowkit) were removed, so no node polyfills needed.
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
      // ✅ Production Backend Proxy (for local dev)
      '/api/lifi-proxy': {
        target: 'https://nebula-labs-ten.vercel.app',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    target: 'esnext',
    sourcemap: true, // Enable for debugging 
    minify: false, // Disable minification for debugging
    chunkSizeWarningLimit: 2000, 
    rollupOptions: {
      output: {
        // manualChunks: {
        //   'vendor-react': ['react', 'react-dom'],
        //   'vendor-wagmi': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
        //   'vendor-ui': ['framer-motion', 'lucide-react', 'styled-components'], 
        // }
      }
    }
  },
})
