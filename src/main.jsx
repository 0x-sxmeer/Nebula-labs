import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { Analytics } from '@vercel/analytics/react' // ✅ NEW
import * as Sentry from "@sentry/react" // ✅ NEW

import { config } from './config/wagmi.config'
import { validateEnvVars } from './config/env'
import './index.css'
import App from './App.jsx'

import ErrorBoundary from './components/ErrorBoundary.jsx'

// ✅ Initialize Sentry (if configured)
// if (ENV.SENTRY_DSN) { ... } // ENV default export removed in new file, assuming Sentry config is separate or handled differently. 
// Actually, let's keep it simple and just fix the validation call first. useSwapMonitoring will handle logic.

// ✅ Validate environment before starting app
try {
  validateEnvVars();
} catch (error) {
  console.error(error);
  // Simple error screen
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0a;
      color: #ff6b35;
      font-family: monospace;
      padding: 20px;
      text-align: center;
    ">
      <div>
        <h1>⚠️ Configuration Error</h1>
        <pre style="
          background: #1a1a1a;
          padding: 20px;
          border-radius: 8px;
          text-align: left;
          max-width: 600px;
          margin: 20px auto;
          overflow-x: auto;
        ">${error.message}</pre>
        <p>Please contact support or check the documentation.</p>
      </div>
    </div>
  `;
  throw error;
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={darkTheme()}>
            <App />
            <Analytics /> {/* ✅ NEW */}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </StrictMode>,
)
