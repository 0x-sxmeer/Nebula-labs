/**
 * SECURITY CONFIGURATION
 * 
 * Contains whitelists and security constants for the application.
 */

// ============================================================================
// APPROVED LIFI ROUTER ADDRESSES (Whitelist)
// ============================================================================
// These addresses should be verified against Li.Fi documentation
// Update this list when Li.Fi deploys new routers
export const APPROVED_LIFI_ROUTERS = {
  1: ['0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'], // Ethereum Mainnet
  137: ['0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'], // Polygon
  56: ['0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'], // BSC
  42161: ['0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'], // Arbitrum
  10: ['0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'], // Optimism
  8453: ['0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'], // Base
  43114: ['0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'], // Avalanche
  // Add more chains as needed
};

// Gas limit bounds (safety checks)
export const GAS_LIMITS = {
  MIN: 21000n, // Minimum for any transaction
  MAX_SAFE: 5000000n, // Normal maximum
  MAX_WARNING: 10000000n // Show warning above this
};
