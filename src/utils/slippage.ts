/**
 * Dynamic Slippage Calculation
 * Moves away from hardcoded defaults (1%) to market-aware safety.
 */

/**
 * Calculates the optimal slippage tolerance based on volatility and asset type.
 * 
 * @param {number[]} priceHistory - Array of recent prices (last 60 mins)
 * @param {boolean} isStablePair - True if swapping like USDC-DAI
 * @returns {number} Slippage as a decimal (e.g. 0.005 for 0.5%)
 */
export function calculateDynamicSlippage(priceHistory: number[], isStablePair: boolean): number {
    // 1. Baseline for Stablecoins
    if (isStablePair) {
        return 0.001; // 0.1% strict for stables
    }

    // 2. Calculate Standard Deviation (Volatility)
    if (!priceHistory || priceHistory.length < 2) {
        return 0.005; // Default 0.5% fallback
    }

    const n = priceHistory.length;
    const mean = priceHistory.reduce((a: number, b: number) => a + b, 0) / n;
    
    const variance = priceHistory.reduce((sum: number, price: number) => {
        return sum + Math.pow(price - mean, 2);
    }, 0) / n;
    
    const stdDev = Math.sqrt(variance);
    const volatilityRatio = stdDev / mean; // Coefficient of Variation

    // 3. Confidence Interval
    // We want to be 95% sure the price won't move beyond this during the block time.
    // Z-score 1.96 covers 95%.
    let recommendedSlippage = volatilityRatio * 2.0;

    // 4. Network Congestion Buffer (Mock logic)
    // If we knew base fee was spiking, we'd add more slippage as blocks are fuller
    const networkBuffer = 0.001; 

    const finalSlippage = recommendedSlippage + networkBuffer;

    // 5. Safety Bounds
    const MIN_SLIPPAGE = 0.005; // 0.5%
    const MAX_SLIPPAGE = 0.05;  // 5.0%

    return Math.min(Math.max(finalSlippage, MIN_SLIPPAGE), MAX_SLIPPAGE);
}
