import { http, createConfig } from "wagmi";
import {
  mainnet,
  polygon,
  bsc,
  arbitrum,
  optimism,
  base,
  avalanche,
} from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

// Get from environment variables with safe fallback
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Graceful handling of missing project ID
if (!projectId) {
  if (import.meta.env.DEV) {
    console.error(
      "⚠️ VITE_WALLETCONNECT_PROJECT_ID is not set.\n" +
        "WalletConnect will not be available.\n" +
        "Get your Project ID from https://cloud.walletconnect.com/",
    );
  }
}

export const config = createConfig({
  chains: [mainnet, polygon, bsc, arbitrum, optimism, base, avalanche],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Nebula Labs Aggregator" }),
    // Only add WalletConnect if projectId is available
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  // ✅ CRITICAL FIX #5: RPC Fallback Strategy with retry configuration
  transports: {
    [mainnet.id]: http('/api/rpc-proxy?chain=ethereum', {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [polygon.id]: http('/api/rpc-proxy?chain=polygon', {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [bsc.id]: http('/api/rpc-proxy?chain=bsc', {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [arbitrum.id]: http('/api/rpc-proxy?chain=arbitrum', {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [optimism.id]: http('/api/rpc-proxy?chain=optimism', {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [base.id]: http('/api/rpc-proxy?chain=base', {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [avalanche.id]: http('/api/rpc-proxy?chain=avalanche', {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  storage: null,
});
