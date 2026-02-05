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
  transports: {
    [mainnet.id]: http('/api/rpc-proxy?chain=ethereum'),
    [polygon.id]: http('/api/rpc-proxy?chain=polygon'),
    [bsc.id]: http('/api/rpc-proxy?chain=bsc'),
    [arbitrum.id]: http('/api/rpc-proxy?chain=arbitrum'),
    [optimism.id]: http('/api/rpc-proxy?chain=optimism'),
    [base.id]: http('/api/rpc-proxy?chain=base'),
    [avalanche.id]: http('/api/rpc-proxy?chain=avalanche'),
  },
  storage: null,
});
