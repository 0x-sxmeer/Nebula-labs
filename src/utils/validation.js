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
