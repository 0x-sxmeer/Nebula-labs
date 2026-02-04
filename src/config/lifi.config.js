/**
 * Li.Fi SDK Configuration
 * Professional Cross-Chain Swap Aggregator Setup
 */

export const LIFI_CONFIG = {
  // ✅ Backend proxy URL (REQUIRED in production)
  apiUrl: import.meta.env.VITE_BACKEND_API_URL 
    ? `${import.meta.env.VITE_BACKEND_API_URL}/lifi-proxy`
    : null, // ❌ No fallback in production
  
  // ❌ REMOVED: apiKey (never expose to client)
  
  defaultSlippage: 0.03,
  integrator: 'blackbox_dapp',
  quoteRefreshInterval: 15000,
};

// Validate configuration on import
if (import.meta.env.PROD && !LIFI_CONFIG.apiUrl) {
  throw new Error('❌ VITE_BACKEND_API_URL is required in production');
}

// RPC URLs (use your own for production)
export const RPC_URLS = {
  1: 'https://eth.llamarpc.com',
  137: 'https://polygon-rpc.com',
  56: 'https://bsc-dataseed.binance.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
};

// Native token addresses (0x0 for native gas tokens)
// Native token addresses (0x0 for native gas tokens)
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

// Threshold for distinguishing EVM vs Non-EVM chains (e.g. Solana, Bitcoin)
export const LARGE_CHAIN_ID_THRESHOLD = 1000000000;

// Popular tokens for quick selection
export const POPULAR_TOKENS = {
  1: [ // Ethereum
    { symbol: 'ETH', address: NATIVE_TOKEN_ADDRESS, name: 'Ethereum', decimals: 18 },
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'USD Coin', decimals: 6 },
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'Tether USD', decimals: 6 },
    { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'Dai Stablecoin', decimals: 18 },
  ],
  137: [ // Polygon
    { symbol: 'MATIC', address: NATIVE_TOKEN_ADDRESS, name: 'Polygon', decimals: 18 },
    { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', name: 'USD Coin', decimals: 6 },
    { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', name: 'Tether USD', decimals: 6 },
  ],
};
