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
    [mainnet.id]: http(
      import.meta.env.VITE_ETHEREUM_RPC || "https://rpc.flashbots.net",
    ),
    [polygon.id]: http(
      import.meta.env.VITE_POLYGON_RPC || "https://polygon-rpc.com",
    ),
    [bsc.id]: http(
      import.meta.env.VITE_BSC_RPC || "https://bsc-dataseed.binance.org",
    ),
    [arbitrum.id]: http(
      import.meta.env.VITE_ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
    ),
    [optimism.id]: http(
      import.meta.env.VITE_OPTIMISM_RPC || "https://mainnet.optimism.io",
    ),
    [base.id]: http(
      import.meta.env.VITE_BASE_RPC || "https://mainnet.base.org",
    ),
    [avalanche.id]: http(
      import.meta.env.VITE_AVALANCHE_RPC ||
        "https://api.avax.network/ext/bc/C/rpc",
    ),
  },
  storage: null,
});
