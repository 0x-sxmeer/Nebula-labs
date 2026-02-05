/**
 * Balance Checker Utility
 * Fetches and validates user token balances before swaps
 */

import { formatUnits, parseUnits } from 'viem';

/**
 * @typedef {Object} BalanceInfo
 * @property {string} balance - Raw balance in smallest unit
 * @property {string} balanceFormatted - Human-readable balance
 * @property {string} balanceUSD - Balance in USD
 * @property {boolean} isSufficient - Whether balance is sufficient for swap
 * @property {boolean} isNative - Whether this is a native token (ETH, MATIC, etc.)
 */

/**
 * Fetch token balance using wagmi
 * @param {Object} params
 * @param {string} params.address - User wallet address
 * @param {Object} params.token - Token object with address, decimals, chainId
 * @param {number} params.chainId - Chain ID
 * @param {Function} params.readContract - wagmi readContract function
 * @param {Function} params.getBalance - wagmi getBalance function
 * @returns {Promise<BalanceInfo>}
 */
export async function fetchTokenBalance({ address, token, chainId, readContract, getBalance }) {
  try {
    const isNative = token.address === '0x0000000000000000000000000000000000000000' ||
                     token.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

    let balance;

    if (isNative) {
      // Fetch native token balance (ETH, MATIC, etc.)
      const result = await getBalance({
        address,
        chainId,
      });
      balance = result.value;
    } else {
      // Fetch ERC20 token balance
      balance = await readContract({
        address: token.address,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: 'balance', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [address],
        chainId,
      });
    }

    const balanceFormatted = formatUnits(balance || '0', token.decimals);
    const balanceUSD = (parseFloat(balanceFormatted) * parseFloat(token.priceUSD || '0')).toFixed(2);

    return {
      balance: balance?.toString() || '0',
      balanceFormatted,
      balanceUSD,
      isNative,
      isSufficient: true, // Will be checked separately
    };
  } catch (error) {
    console.error('Error fetching balance:', error);
    return {
      balance: '0',
      balanceFormatted: '0',
      balanceUSD: '0',
      isNative: false,
      isSufficient: false,
    };
  }
}

/**
 * Check if user has sufficient balance for swap (including gas)
 * Issue #3 Fix: Properly accounts for gas when swapping native tokens
 * @param {Object} params
 * @param {string} params.userBalance - User's token balance in smallest unit
 * @param {string} params.swapAmount - Amount to swap in smallest unit
 * @param {string} params.estimatedGas - Estimated gas cost in native token (smallest unit)
 * @param {boolean} params.isNativeToken - Whether swapping native token
 * @param {number} [params.decimals=18] - Token decimals for formatting
 * @param {string} [params.symbol='ETH'] - Token symbol for messaging
 * @returns {{isSufficient: boolean, shortfall: string, shortfallFormatted: string, message: string}}
 */
export function checkSufficientBalance({ userBalance, swapAmount, estimatedGas = '0', isNativeToken, decimals = 18, symbol = 'ETH' }) {
  const balance = BigInt(userBalance || '0');
  const amount = BigInt(swapAmount || '0');
  const gas = BigInt(estimatedGas || '0');

  // For native tokens, need balance for both swap AND gas
  // Add 10% buffer for gas price volatility
  const gasWithBuffer = isNativeToken ? (gas * 110n) / 100n : 0n;
  const requiredAmount = isNativeToken ? amount + gasWithBuffer : amount;

  if (balance < requiredAmount) {
    const shortfall = (requiredAmount - balance).toString();
    const shortfallFormatted = (Number(shortfall) / Math.pow(10, decimals)).toFixed(6);
    
    // Provide detailed message for native tokens
    const gasFormatted = (Number(gasWithBuffer) / Math.pow(10, decimals)).toFixed(6);
    const message = isNativeToken
      ? `Insufficient balance. Need ${shortfallFormatted} more ${symbol} (includes ~${gasFormatted} ${symbol} for gas)`
      : 'Insufficient token balance';
    
    console.warn(`⚠️ Balance check failed: Need ${shortfallFormatted} more ${symbol}`);
    
    return {
      isSufficient: false,
      shortfall,
      shortfallFormatted,
      message,
    };
  }

  // For non-native tokens, still check if there's enough native token for gas
  if (!isNativeToken && gas > 0n) {
    // This check would require fetching native balance separately
    // For now, we'll just warn but allow the transaction
    return {
      isSufficient: true,
      shortfall: '0',
      shortfallFormatted: '0',
      message: 'Sufficient balance',
    };
  }

  return {
    isSufficient: true,
    shortfall: '0',
    shortfallFormatted: '0',
    message: 'Sufficient balance',
  };
}

/**
 * Estimate gas cost for a route
 * Issue #3 Fix: Properly extracts gas costs from Li.Fi route structure
 * @param {Object} route - Li.Fi route object
 * @param {Object} gasPrice - Gas price object from Li.Fi (fallback only)
 * @returns {string} Estimated gas cost in native token (smallest unit)
 */
export function estimateGasCost(route, gasPrice) {
  try {
    // Li.Fi provides gas costs directly in the route - prefer these as they're pre-calculated
    let totalGasCostWei = 0n;

    if (route.steps) {
      route.steps.forEach(step => {
        // Li.Fi gasCosts array contains objects with 'amount' (in wei) and 'amountUSD'
        if (step.estimate?.gasCosts && Array.isArray(step.estimate.gasCosts)) {
          step.estimate.gasCosts.forEach(gasCost => {
            // 'amount' is already in native token smallest unit (wei)
            if (gasCost.amount) {
              totalGasCostWei += BigInt(gasCost.amount);
            }
          });
        }
      });
    }

    // If we got gas costs from the route, return them
    if (totalGasCostWei > 0n) {
      return totalGasCostWei.toString();
    }

    // Fallback: Calculate from gas units if no pre-calculated costs
    let totalGasUnits = 0;
    if (route.steps) {
      route.steps.forEach(step => {
        // Try to get gas limit from transaction request
        const gasLimit = step.transactionRequest?.gasLimit || step.estimate?.gasLimit;
        if (gasLimit) {
          totalGasUnits += parseInt(gasLimit);
        }
      });
    }

    // If no gas estimate, use a conservative estimate
    if (totalGasUnits === 0) {
      // Default: ~300k gas units for swaps, ~500k for cross-chain
      const isCrossChain = route.fromChainId !== route.toChainId;
      totalGasUnits = isCrossChain ? 500000 : 300000;
    }

    // Multiply by gas price (use 'fast' tier for safety)
    const gasPriceWei = gasPrice?.fast || gasPrice?.standard || 20000000000; // 20 gwei fallback
    const estimatedCost = BigInt(totalGasUnits) * BigInt(Math.floor(gasPriceWei));

    return estimatedCost.toString();
  } catch (error) {
    console.error('Error estimating gas:', error);
    // Return a safe default (0.01 ETH in wei)
    return '10000000000000000';
  }
}

/**
 * Format balance display with proper decimals
 * @param {string} balance - Balance in smallest unit
 * @param {number} decimals - Token decimals
 * @param {number} [maxDecimals=6] - Max decimal places to show
 * @returns {string}
 */
export function formatBalanceDisplay(balance, decimals, maxDecimals = 6) {
  try {
    const formatted = formatUnits(balance || '0', decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.000001) return '< 0.000001';
    
    // Use fewer decimals for large numbers
    if (num >= 1000) return num.toFixed(2);
    if (num >= 1) return num.toFixed(4);
    
    return num.toFixed(Math.min(maxDecimals, 6));
  } catch {
    return '0';
  }
}

/**
 * Calculate percentage of balance being used
 * @param {string} swapAmount - Amount to swap (smallest unit)
 * @param {string} totalBalance - Total balance (smallest unit)
 * @returns {number} Percentage (0-100)
 */
export function calculateBalancePercentage(swapAmount, totalBalance) {
  try {
    const amount = BigInt(swapAmount || '0');
    const balance = BigInt(totalBalance || '0');
    
    if (balance === 0n) return 0;
    
    const percentage = (Number(amount) / Number(balance)) * 100;
    return Math.min(100, Math.max(0, percentage));
  } catch {
    return 0;
  }
}
