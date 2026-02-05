/**
 * Slippage Validator
 * Prevents dangerous slippage values and warns users about risks.
 */

export const SLIPPAGE_LIMITS = {
    MIN: 0.01, // 0.01% minimum
    SAFE_MAX: 1.0, // 1% safe maximum for most pairs
    WARNING_THRESHOLD: 2.0, // Warn above 2%
    ABSOLUTE_MAX: 50.0, // 50% absolute maximum (prevent typos)
  };
  
  /**
   * Validate slippage value
   * @param {string|number} slippage 
   * @returns {Object} { valid, level, message }
   */
  export const validateSlippage = (slippage) => {
    const value = parseFloat(slippage);
  
    if (isNaN(value) || value < SLIPPAGE_LIMITS.MIN) {
      return {
        valid: false,
        level: 'error',
        message: `Min slippage is ${SLIPPAGE_LIMITS.MIN}%`
      };
    }
  
    if (value > SLIPPAGE_LIMITS.ABSOLUTE_MAX) {
      return {
        valid: false,
        level: 'error',
        message: `Max slippage is ${SLIPPAGE_LIMITS.ABSOLUTE_MAX}%`
      };
    }
  
    if (value > 5.0) {
        return {
            valid: true,
            level: 'critical',
            message: `⚠️ CRITICAL: ${value}% slippage is extremely high! You may lose value.`
        };
    }

    if (value > SLIPPAGE_LIMITS.WARNING_THRESHOLD) {
      return {
        valid: true,
        level: 'warning',
        message: `⚠️ High slippage (${value}%) increases MEV risk`
      };
    }
  
    if (value > SLIPPAGE_LIMITS.SAFE_MAX) {
      return {
        valid: true,
        level: 'caution',
        message: `Slippage > ${SLIPPAGE_LIMITS.SAFE_MAX}%`
      };
    }
  
    return {
      valid: true,
      level: 'safe',
      message: null
    };
  };
  
  /**
   * Get recommended slippage based on route characteristics
   * @param {Object} route - Li.Fi route object
   * @returns {number} Recommended slippage
   */
  export const getRecommendedSlippage = (route) => {
    if (!route) return 0.5;

    // Check if route is volatile (multiple hops, exotic tokens, etc.)
    const stepCount = route.steps?.length || 1;
    const hasExoticTokens = route.tags?.includes('HIGH_PRICE_IMPACT');
    const isCrossChain = route.fromChainId !== route.toChainId;
    
    if (stepCount > 2 || hasExoticTokens) {
      return 1.0; // 1% for complex/volatile routes
    }
    
    if (isCrossChain) {
        return 0.5;
    }

    return 0.3; // 0.3% for standard stable/major swaps
  };
