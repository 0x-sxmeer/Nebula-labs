import { http, createConfig, fallback } from "wagmi";
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
  // ✅ CRITICAL FIX: Resilient RPC Strategy (Multiple Fallbacks)
  transports: {
    [mainnet.id]: fallback([
      http('https://cloudflare-eth.com'),
      http('https://rpc.ankr.com/eth'),
      http('https://eth.llamarpc.com')
    ]),
    [polygon.id]: fallback([
      http('https://polygon-rpc.com'),
      http('https://rpc.ankr.com/polygon'),
      http('https://1rpc.io/matic')
    ]),
    [bsc.id]: fallback([
      http('https://bsc-dataseed1.binance.org'),
      http('https://bsc-dataseed2.binance.org'),
      http('https://bsc-dataseed3.binance.org')
    ]),
    [arbitrum.id]: fallback([
      http('https://arb1.arbitrum.io/rpc'),
      http('https://rpc.ankr.com/arbitrum'),
      http('https://1rpc.io/arb')
    ]),
    [optimism.id]: fallback([
      http('https://mainnet.optimism.io'),
      http('https://rpc.ankr.com/optimism'),
      http('https://1rpc.io/op')
    ]),
    [base.id]: fallback([
      http('https://mainnet.base.org'),
      http('https://rpc.ankr.com/base'),
      http('https://1rpc.io/base')
    ]),
    [avalanche.id]: fallback([
      http('https://api.avax.network/ext/bc/C/rpc'),
      http('https://rpc.ankr.com/avalanche'),
      http('https://1rpc.io/avax/c')
    ]),
  },
  storage: null,
});
