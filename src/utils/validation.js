export const validateAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validateAmount = (amount, decimals = 18, options = {}) => {
  const { min = 0, max = Infinity, allowZero = false } = options;
  const num = parseFloat(amount);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number' };
  }
  
  if (!allowZero && num === 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (num < min) {
    return { valid: false, error: `Amount must be at least ${min}` };
  }
  
  if (num > max) {
    return { valid: false, error: 'Insufficient balance' };
  }
  
  return { valid: true };
};

export const validateSlippage = (slippage) => {
  const num = parseFloat(slippage);
  
  if (isNaN(num) || num < 0) {
    return { valid: false, level: 'error', error: 'Invalid slippage' };
  }
  
  // ✅ Issue #11: 10% hard limit (MEV protection)
  if (num > 10) {
    return { valid: false, level: 'error', error: 'Slippage cannot exceed 10% (MEV protection)' };
  }
  
  if (num > 5) {
    return { valid: true, level: 'critical', warning: '⚠️ CRITICAL: Extremely high slippage may result in significant value loss' };
  }
  
  if (num > 2) {
    return { valid: true, level: 'warning', message: 'High slippage increases MEV attack risk' };
  }
  
  return { valid: true, level: 'safe' };
};

export const validateRoute = (route) => {
  if (!route) return { valid: false, error: 'No route selected' };
  if (!route.steps || route.steps.length === 0) return { valid: false, error: 'Invalid route steps' };
  return { valid: true };
};

export const sanitizeInput = (input) => {
  return input.trim().replace(/[^a-zA-Z0-9\s.-]/g, '');
};

/**
 * CRITICAL: Sanitize numeric input for swap amounts
 * Prevents: scientific notation, negatives, multiple decimals, overflow
 * @param {string} input - Raw user input
 * @param {number} maxDecimals - Maximum decimal places allowed (default: 18)
 * @returns {string} - Sanitized numeric string or empty string if invalid
 */
export const sanitizeNumericInput = (input, maxDecimals = 18) => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove all non-numeric characters except decimal point
  let cleaned = input.replace(/[^0-9.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Prevent leading zeros (except "0" or "0.x")
  if (cleaned.startsWith('0') && cleaned.length > 1 && !cleaned.startsWith('0.')) {
    cleaned = cleaned.replace(/^0+/, '');
    if (cleaned.startsWith('.')) {
      cleaned = '0' + cleaned;
    }
    if (cleaned === '') {
      cleaned = '0';
    }
  }
  
  // Limit decimal places
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    cleaned = parts[0] + '.' + parts[1].slice(0, maxDecimals);
  }
  
  // Reject if empty or would parse as NaN/Infinity
  if (!cleaned || cleaned === '.') return '';
  
  const num = parseFloat(cleaned);
  if (isNaN(num) || !isFinite(num)) return '';
  
  // Reject negative (shouldn't happen after cleanup, but safety check)
  if (num < 0) return '';
  
  // Reject unreasonable values (1 trillion max)
  if (num > 1e12) return '';
  
  return cleaned;
};

/**
 * Validate swap amount with comprehensive checks
 * @param {string} amount - User-provided amount string
 * @param {number} decimals - Token decimals
 * @param {bigint} balance - User's token balance (in smallest units)
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateSwapAmount = (amount, decimals = 18, balance = null) => {
  if (!amount || parseFloat(amount) <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  // Check decimals don't exceed token decimals
  const decimalPart = amount.split('.')[1] || '';
  if (decimalPart.length > decimals) {
    return { valid: false, error: `Maximum ${decimals} decimal places allowed` };
  }
  
  // Check against balance if provided
  if (balance !== null) {
    try {
      const amountInSmallest = BigInt(Math.floor(parseFloat(amount) * (10 ** decimals)));
      if (amountInSmallest > balance) {
        return { valid: false, error: 'Exceeds balance' };
      }
    } catch (e) {
      return { valid: false, error: 'Invalid amount format' };
    }
  }
  
  return { valid: true };
};
