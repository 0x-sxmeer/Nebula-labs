/**
 * Slippage Helper Utilities
 * Provides functions to fetch price data and determine pair stability
 */

import { calculateDynamicSlippage } from './slippage';

/**
 * Determines if a token pair consists of stablecoins
 */
export function isStablePair(token0Symbol: string, token1Symbol: string): boolean {
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'LUSD', 'UST', 'TUSD'];
  
  const token0Stable = stablecoins.some(stable => 
    token0Symbol.toUpperCase().includes(stable)
  );
  
  const token1Stable = stablecoins.some(stable => 
    token1Symbol.toUpperCase().includes(stable)
  );
  
  return token0Stable && token1Stable;
}

/**
 * Fetches recent price history for a token pair
 * In production, this would call a price oracle or historical API
 */
export async function fetchPriceHistory(
  fromTokenAddress: string,
  toTokenAddress: string,
  chainId: number
): Promise<number[]> {
  // Mock implementation - in production, fetch from CoinGecko, Chainlink, or similar
  // For now, return empty array to use fallback slippage
  
  try {
    // TODO: Integrate with actual price feed
    // Example: CoinGecko API, Chainlink Price Feeds, or DEX historical data
    
    // Mock: Generate some sample price data based on current time
    const mockPrices: number[] = [];
    const basePrice = 1.0;
    
    // Simulate 60 data points (1 per minute for last hour)
    for (let i = 0; i < 60; i++) {
      // Add small random variance
      const variance = (Math.random() - 0.5) * 0.02; // ±1% variance
      mockPrices.push(basePrice * (1 + variance));
    }
    
    return mockPrices;
  } catch (error) {
    console.warn('Failed to fetch price history:', error);
    return [];
  }
}

/**
 * Gets recommended slippage for a token pair
 */
export async function getRecommendedSlippage(
  fromToken: { symbol: string; address: string },
  toToken: { symbol: string; address: string },
  chainId: number
): Promise<number> {
  const isStable = isStablePair(fromToken.symbol, toToken.symbol);
  
  // For stable pairs, use strict slippage immediately
  if (isStable) {
    return 0.001; // 0.1%
  }
  
  // Fetch price history
  const priceHistory = await fetchPriceHistory(
    fromToken.address,
    toToken.address,
    chainId
  );
  
  // Calculate dynamic slippage
  return calculateDynamicSlippage(priceHistory, isStable);
}
