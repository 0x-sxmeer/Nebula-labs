/**
 * securityHelpers.js - Additional security utilities
 */

import { formatUnits } from 'viem';
import { logger } from './logger';

/**
 * Validate Ethereum address format
 */
export const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate transaction request before sending
 */
export const validateTransactionRequest = (txRequest, context = {}) => {
  const errors = [];
  
  // Check destination address
  if (!txRequest.to || !isValidAddress(txRequest.to)) {
    errors.push('Invalid destination address');
  }
  
  // Check data field
  if (!txRequest.data || txRequest.data === '0x') {
    errors.push('Empty transaction data');
  }
  
  // Check value for native token swaps
  if (context.isNativeSwap && (!txRequest.value || BigInt(txRequest.value) === BigInt(0))) {
    errors.push('Missing value for native token swap');
  }
  
  // Check gas limit is reasonable
  if (txRequest.gasLimit) {
    const gasLimit = BigInt(txRequest.gasLimit);
    if (gasLimit < BigInt(21000)) {
      errors.push('Gas limit too low');
    }
    if (gasLimit > BigInt(10000000)) {
      errors.push('Gas limit suspiciously high (potential attack)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculate minimum gas needed for transaction
 */
export const calculateMinimumGas = (route) => {
  if (!route?.gasCosts?.[0]) {
    return BigInt(150000); // Default estimate
  }
  
  const estimate = route.gasCosts[0].estimate;
  const gasPrice = route.gasCosts[0].price;
  
  return BigInt(estimate) * BigInt(gasPrice);
};

/**
 * Check if route is safe to execute
 */
export const isRouteSafe = (route, userBalance, tokenDecimals) => {
  const checks = {
    hasSteps: route?.steps?.length > 0,
    hasValidPriceImpact: (route?.priceImpact || 0) < 10, // < 10% impact
    hasSufficientOutput: route?.toAmount && BigInt(route.toAmount) > BigInt(0),
    validGasEstimate: route?.gasCosts?.[0]?.estimate > 0,
  };
  
  // Check if user has enough balance + gas
  if (route && userBalance && tokenDecimals) {
    const amountNeeded = BigInt(route.fromAmount);
    const gas = calculateMinimumGas(route);
    const total = amountNeeded + gas;
    
    checks.sufficientBalance = BigInt(userBalance) >= total;
  }
  
  const allPassed = Object.values(checks).every(check => check === true);
  
  if (!allPassed) {
    logger.warn('Route safety checks failed:', checks);
  }
  
  return {
    safe: allPassed,
    checks
  };
};

export default {
  isValidAddress,
  validateTransactionRequest,
  calculateMinimumGas,
  isRouteSafe
};
