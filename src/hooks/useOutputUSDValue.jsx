/**
 * ✅ FIXED: Accurate USD Value Calculation for Swap Outputs
 * 
 * This hook ensures USD values are calculated from FRESH data in routes,
 * not from stale token metadata prices.
 * 
 * Priority order:
 * 1. route.toAmountUSD (most accurate - from LiFi quote)
 * 2. route.toToken.priceUSD (fresher than metadata)
 * 3. toToken.priceUSD (fallback - may be stale)
 */

import { useMemo } from 'react';
import { formatUnits } from 'viem';

/**
 * Hook to calculate accurate output USD value
 * @param {Object} selectedRoute - The selected swap route from LiFi
 * @param {Object} toToken - The destination token metadata
 * @returns {number} - USD value of the output amount
 */
export const useOutputUSDValue = (selectedRoute, toToken) => {
  return useMemo(() => {
    if (!selectedRoute) {
      console.log('[USD Calc] No route selected');
      return 0;
    }
    
    // === PRIORITY 1: Use fresh USD value from route ===
    if (selectedRoute.toAmountUSD) {
      const usdValue = parseFloat(selectedRoute.toAmountUSD);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[USD Calc] Using route.toAmountUSD:', {
          value: usdValue,
          route: selectedRoute.toAmountUSD
        });
      }
      
      return usdValue;
    }
    
    // === PRIORITY 2: Calculate from route's token price ===
    if (selectedRoute.toAmount && selectedRoute.toToken?.priceUSD && selectedRoute.toToken?.decimals) {
      try {
        const amount = parseFloat(formatUnits(
          BigInt(selectedRoute.toAmount),
          selectedRoute.toToken.decimals
        ));
        
        const price = parseFloat(selectedRoute.toToken.priceUSD);
        const usdValue = amount * price;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[USD Calc] Calculated from route token:', {
            amount,
            price,
            decimals: selectedRoute.toToken.decimals,
            value: usdValue
          });
        }
        
        return usdValue;
      } catch (error) {
        console.error('[USD Calc] Error calculating from route token:', error);
        // Fall through to next method
      }
    }
    
    // === PRIORITY 3: Fallback to metadata token price ===
    if (selectedRoute.toAmount && toToken?.priceUSD && toToken?.decimals) {
      try {
        const amount = parseFloat(formatUnits(
          BigInt(selectedRoute.toAmount),
          toToken.decimals
        ));
        
        const price = parseFloat(toToken.priceUSD);
        const usdValue = amount * price;
        
        console.warn('[USD Calc] Using fallback metadata price (may be stale):', {
          amount,
          price,
          value: usdValue
        });
        
        return usdValue;
      } catch (error) {
        console.error('[USD Calc] Error calculating from metadata:', error);
        return 0;
      }
    }
    
    console.warn('[USD Calc] Could not calculate USD value - missing data:', {
      hasRoute: !!selectedRoute,
      hasToAmountUSD: !!selectedRoute?.toAmountUSD,
      hasToAmount: !!selectedRoute?.toAmount,
      hasRouteTokenPrice: !!selectedRoute?.toToken?.priceUSD,
      hasMetadataPrice: !!toToken?.priceUSD
    });
    
    return 0;
  }, [selectedRoute, toToken]);
};

/**
 * Hook to calculate accurate INPUT USD value (for consistency)
 * @param {string} fromAmount - Human-readable input amount
 * @param {Object} fromToken - The source token metadata
 * @param {Object} selectedRoute - The selected route (for validation)
 * @returns {number} - USD value of the input amount
 */
export const useInputUSDValue = (fromAmount, fromToken, selectedRoute) => {
  return useMemo(() => {
    if (!fromAmount || !fromToken || parseFloat(fromAmount) === 0) {
      return 0;
    }
    
    // === PRIORITY 1: Use fresh price from selected route ===
    if (selectedRoute?.fromAmountUSD) {
      const usdValue = parseFloat(selectedRoute.fromAmountUSD);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[USD Calc Input] Using route.fromAmountUSD:', usdValue);
      }
      
      return usdValue;
    }
    
    // === PRIORITY 2: Use route's from token price ===
    if (selectedRoute?.fromToken?.priceUSD) {
      try {
        const amount = parseFloat(fromAmount);
        const price = parseFloat(selectedRoute.fromToken.priceUSD);
        const usdValue = amount * price;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[USD Calc Input] Calculated from route token:', {
            amount,
            price,
            value: usdValue
          });
        }
        
        return usdValue;
      } catch (error) {
        console.error('[USD Calc Input] Error calculating from route token:', error);
      }
    }
    
    // === PRIORITY 3: Fallback to metadata price ===
    try {
      const amount = parseFloat(fromAmount);
      const price = parseFloat(fromToken.priceUSD || '0');
      const usdValue = amount * price;
      
      if (price === 0) {
        console.warn('[USD Calc Input] Token price is 0:', fromToken.symbol);
      }
      
      return usdValue;
    } catch (error) {
      console.error('[USD Calc Input] Error calculating USD value:', error);
      return 0;
    }
  }, [fromAmount, fromToken, selectedRoute]);
};

/**
 * Enhanced component for displaying output amount with USD value
 * Shows both expected and minimum amounts (accounting for slippage)
 */
export const OutputAmountDisplay = ({ route, toToken }) => {
  const outputUSD = useOutputUSDValue(route, toToken);
  
  if (!route || !toToken) {
    return <div className="output-amount-placeholder">Select a route...</div>;
  }
  
  // Calculate expected amount
  const expectedAmount = useMemo(() => {
    try {
      return parseFloat(formatUnits(
        BigInt(route.toAmount || '0'),
        toToken.decimals
      ));
    } catch (error) {
      console.error('[Output Display] Error formatting expected amount:', error);
      return 0;
    }
  }, [route, toToken]);
  
  // Calculate minimum amount (after slippage)
  const minimumAmount = useMemo(() => {
    if (!route.toAmountMin) return expectedAmount;
    
    try {
      return parseFloat(formatUnits(
        BigInt(route.toAmountMin),
        toToken.decimals
      ));
    } catch (error) {
      console.error('[Output Display] Error formatting minimum amount:', error);
      return expectedAmount * 0.97; // Fallback to 3% slippage
    }
  }, [route, toToken, expectedAmount]);
  
  // Calculate actual slippage percentage
  const slippagePercent = useMemo(() => {
    if (expectedAmount === 0) return 0;
    return ((expectedAmount - minimumAmount) / expectedAmount * 100).toFixed(2);
  }, [expectedAmount, minimumAmount]);
  
  return (
    <div className="output-amount-container">
      {/* Main amount display */}
      <div className="output-amount-main">
        <div className="amount-value">
          {expectedAmount.toFixed(6)} {toToken.symbol}
        </div>
        <div className="amount-usd">
          ≈ ${outputUSD.toFixed(2)}
        </div>
      </div>
      
      {/* Minimum amount (slippage protection) */}
      {minimumAmount !== expectedAmount && (
        <div className="output-amount-min">
          <div className="min-label">
            Minimum after {slippagePercent}% slippage:
          </div>
          <div className="min-value">
            {minimumAmount.toFixed(6)} {toToken.symbol}
          </div>
        </div>
      )}
      
      {/* Accuracy indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          fontSize: '0.7rem', 
          color: route.toAmountUSD ? '#4caf50' : '#ff9800',
          marginTop: '4px'
        }}>
          {route.toAmountUSD ? '✓ Fresh price' : '⚠ Calculated price'}
        </div>
      )}
    </div>
  );
};

export default {
  useOutputUSDValue,
  useInputUSDValue,
  OutputAmountDisplay
};
