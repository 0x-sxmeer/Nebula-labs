/**
 * balanceChecker.js - ENHANCED VERSION
 * 
 * HIGH PRIORITY FIX #3: Balance Checking with Gas Reserve Validation
 * 
 * This utility provides comprehensive balance checking that includes:
 * - Token balance verification
 * - Gas cost estimation
 * - Native token reserve for gas
 * - Multi-chain support
 * 
 * Prevents users from approving swaps they cannot execute due to
 * insufficient gas funds.
 * 
 * @author Senior Web3 Developer
 * @version 2.0.0
 */

import { formatUnits, parseUnits } from 'viem';
import { fetchBalance } from '@wagmi/core';
import { config } from '../config/wagmi.config';
import { NATIVE_TOKEN_ADDRESS } from '../config/lifi.config';
import { logger } from './logger';

/**
 * Gas buffer multipliers for different transaction types
 */
const GAS_BUFFER = {
  SIMPLE_SWAP: 1.2, // 20% buffer for DEX swaps
  COMPLEX_SWAP: 1.5, // 50% buffer for multi-hop swaps
  BRIDGE: 2.0, // 100% buffer for bridge transactions
};

/**
 * Minimum gas reserves by chain (in native token, 18 decimals)
 */
const MIN_GAS_RESERVE = {
  1: parseUnits('0.005', 18), // Ethereum - 0.005 ETH
  137: parseUnits('0.5', 18), // Polygon - 0.5 MATIC
  56: parseUnits('0.001', 18), // BSC - 0.001 BNB
  42161: parseUnits('0.001', 18), // Arbitrum - 0.001 ETH
  10: parseUnits('0.001', 18), // Optimism - 0.001 ETH
  8453: parseUnits('0.001', 18), // Base - 0.001 ETH
  43114: parseUnits('0.05', 18), // Avalanche - 0.05 AVAX
};

/**
 * Check if user has sufficient balance including gas reserves
 * 
 * @param {Object} params - Balance check parameters
 * @param {string} params.walletAddress - User's wallet address
 * @param {string} params.tokenAddress - Token to swap
 * @param {string|number} params.amount - Amount to swap
 * @param {number} params.decimals - Token decimals
 * @param {number} params.chainId - Chain ID
 * @param {string} [params.estimatedGas] - Estimated gas cost in wei
 * @param {boolean} [params.isNative] - Whether token is native (ETH/MATIC/etc)
 * @param {Object} [params.route] - Li.Fi route object for better gas estimation
 * 
 * @returns {Promise<Object>} Balance check result
 */
export const checkSufficientBalanceWithGas = async ({
  walletAddress,
  tokenAddress,
  amount,
  decimals,
  chainId,
  estimatedGas = '0',
  isNative = false,
  route = null,
}) => {
  // Validation
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  if (!amount || parseFloat(amount) <= 0) {
    return {
      sufficient: true,
      balance: '0',
      gasReserve: '0',
      warnings: [],
    };
  }

  try {
    const requiredAmount = parseUnits(amount.toString(), decimals);
    const gasRequired = BigInt(estimatedGas);

    logger.log('Checking balance with gas:', {
      token: tokenAddress,
      amount: amount.toString(),
      gasWei: gasRequired.toString(),
      isNative,
      chainId,
    });

    // Fetch token balance
    const tokenBalance = await fetchBalance(config, {
      address: walletAddress,
      token: isNative ? undefined : tokenAddress,
      chainId: chainId,
    });

    logger.log('Token balance fetched:', {
      symbol: tokenBalance.symbol,
      value: formatUnits(tokenBalance.value, decimals),
      decimals: tokenBalance.decimals,
    });

    const hasEnoughTokens = tokenBalance.value >= requiredAmount;

    // For native tokens, check if total (amount + gas) is available
    if (isNative) {
      const totalRequired = requiredAmount + gasRequired;
      const sufficient = tokenBalance.value >= totalRequired;

      const result = {
        sufficient,
        balance: formatUnits(tokenBalance.value, decimals),
        balanceRaw: tokenBalance.value.toString(),
        required: formatUnits(totalRequired, decimals),
        gasReserve: formatUnits(gasRequired, 18),
        gasReserveRaw: gasRequired.toString(),
        shortage: sufficient 
          ? '0' 
          : formatUnits(totalRequired - tokenBalance.value, decimals),
        shortageRaw: sufficient 
          ? '0' 
          : (totalRequired - tokenBalance.value).toString(),
        reason: sufficient 
          ? null 
          : `Insufficient ${tokenBalance.symbol} (need ${formatUnits(totalRequired, decimals)} including gas)`,
        tokenSymbol: tokenBalance.symbol,
        isNative: true,
        warnings: [],
      };

      // Add warning if balance is very close to minimum
      if (sufficient && tokenBalance.value < totalRequired + (MIN_GAS_RESERVE[chainId] || 0n)) {
        result.warnings.push({
          level: 'warning',
          message: `Low ${tokenBalance.symbol} balance. Consider leaving more for future transactions.`,
        });
      }

      return result;
    }

    // For ERC20 tokens, check token balance first
    if (!hasEnoughTokens) {
      return {
        sufficient: false,
        balance: formatUnits(tokenBalance.value, decimals),
        balanceRaw: tokenBalance.value.toString(),
        required: formatUnits(requiredAmount, decimals),
        shortage: formatUnits(requiredAmount - tokenBalance.value, decimals),
        shortageRaw: (requiredAmount - tokenBalance.value).toString(),
        reason: `Insufficient ${tokenBalance.symbol} balance`,
        tokenSymbol: tokenBalance.symbol,
        isNative: false,
        warnings: [],
      };
    }

    // Token balance is sufficient - now check native balance for gas
    const nativeBalance = await fetchBalance(config, {
      address: walletAddress,
      chainId: chainId,
    });

    logger.log('Native balance fetched:', {
      symbol: nativeBalance.symbol,
      value: formatUnits(nativeBalance.value, 18),
    });

    const hasEnoughGas = nativeBalance.value >= gasRequired;
    const minReserve = MIN_GAS_RESERVE[chainId] || parseUnits('0.001', 18);
    const hasMinimumReserve = nativeBalance.value >= minReserve;

    const result = {
      sufficient: hasEnoughGas,
      balance: formatUnits(tokenBalance.value, decimals),
      balanceRaw: tokenBalance.value.toString(),
      required: formatUnits(requiredAmount, decimals),
      gasReserve: formatUnits(nativeBalance.value, 18),
      gasReserveRaw: nativeBalance.value.toString(),
      gasRequired: formatUnits(gasRequired, 18),
      gasRequiredRaw: gasRequired.toString(),
      shortage: hasEnoughGas 
        ? '0' 
        : formatUnits(gasRequired - nativeBalance.value, 18),
      shortageRaw: hasEnoughGas 
        ? '0' 
        : (gasRequired - nativeBalance.value).toString(),
      reason: hasEnoughGas 
        ? null 
        : `Insufficient ${nativeBalance.symbol} for gas (need ${formatUnits(gasRequired, 18)})`,
      tokenSymbol: tokenBalance.symbol,
      nativeSymbol: nativeBalance.symbol,
      isNative: false,
      warnings: [],
    };

    // Add warnings
    if (hasEnoughGas && !hasMinimumReserve) {
      result.warnings.push({
        level: 'caution',
        message: `Low ${nativeBalance.symbol} balance. You may not have enough for multiple transactions.`,
      });
    }

    if (hasEnoughGas && nativeBalance.value < gasRequired + minReserve) {
      result.warnings.push({
        level: 'warning',
        message: `Your ${nativeBalance.symbol} balance is very close to the gas requirement. Consider adding more.`,
      });
    }

    return result;

  } catch (error) {
    logger.error('Balance check failed:', error);
    throw new Error(`Failed to check balance: ${error.message}`);
  }
};

/**
 * Estimate gas cost for a swap transaction
 * 
 * @param {Object} params - Estimation parameters
 * @param {Object} params.route - Li.Fi route object
 * @param {number} params.chainId - Chain ID
 * @param {string|bigint} [params.gasPrice] - Current gas price in wei
 * 
 * @returns {Promise<bigint>} Estimated gas cost in wei
 */
export const estimateSwapGasCost = async ({
  route,
  chainId,
  gasPrice,
}) => {
  try {
    // Get gas limit from route
    const step = route?.steps?.[0];
    
    if (!step) {
      logger.warn('No step found in route, using fallback gas estimate');
      return parseUnits('0.01', 18); // Fallback: 0.01 ETH
    }

    // Extract gas limit from route
    const gasCosts = step.estimate?.gasCosts || [];
    const gasLimit = gasCosts[0]?.limit || gasCosts[0]?.estimate;

    if (!gasLimit) {
      logger.warn('No gas limit in route, using fallback');
      return parseUnits('0.01', 18);
    }

    // Get gas price (from parameter or route)
    let effectiveGasPrice = gasPrice;
    
    if (!effectiveGasPrice) {
      const gasPriceFromRoute = gasCosts[0]?.price;
      if (gasPriceFromRoute) {
        effectiveGasPrice = BigInt(gasPriceFromRoute);
      } else {
        logger.warn('No gas price available, using fallback');
        return parseUnits('0.01', 18);
      }
    }

    // Calculate base gas cost
    const gasCostWei = BigInt(gasLimit) * BigInt(effectiveGasPrice);

    // Determine buffer based on transaction type
    let buffer = GAS_BUFFER.SIMPLE_SWAP;
    
    if (step.type === 'cross') {
      buffer = GAS_BUFFER.BRIDGE;
    } else if (route.steps.length > 1) {
      buffer = GAS_BUFFER.COMPLEX_SWAP;
    }

    // Apply buffer
    const bufferedGasCost = (gasCostWei * BigInt(Math.floor(buffer * 100))) / 100n;

    logger.log('Gas estimation:', {
      gasLimit: gasLimit.toString(),
      gasPrice: effectiveGasPrice.toString(),
      baseCost: formatUnits(gasCostWei, 18),
      buffered: formatUnits(bufferedGasCost, 18),
      buffer: `${(buffer - 1) * 100}%`,
    });

    return bufferedGasCost;

  } catch (error) {
    logger.error('Gas estimation failed:', error);
    // Fallback to safe estimate
    return parseUnits('0.01', 18);
  }
};

/**
 * Get minimum gas reserve recommendation for a chain
 * 
 * @param {number} chainId - Chain ID
 * @returns {bigint} Minimum gas reserve in wei
 */
export const getMinGasReserve = (chainId) => {
  return MIN_GAS_RESERVE[chainId] || parseUnits('0.001', 18);
};

/**
 * Format balance check result for UI display
 * 
 * @param {Object} result - Balance check result
 * @returns {Object} Formatted for UI
 */
export const formatBalanceCheckForUI = (result) => {
  if (result.sufficient) {
    return {
      canProceed: true,
      message: null,
      details: null,
      warnings: result.warnings || [],
    };
  }

  return {
    canProceed: false,
    message: result.reason,
    details: {
      balance: result.balance,
      required: result.required || result.balance,
      shortage: result.shortage,
      gasReserve: result.gasReserve,
      gasRequired: result.gasRequired,
    },
    warnings: result.warnings || [],
  };
};

/**
 * Legacy function for backward compatibility
 * (Maps to new function)
 */
export const checkSufficientBalance = async (params) => {
    // Adapter for legacy calls that passed 'userBalance', 'swapAmount' etc strings
    if (params.userBalance !== undefined) {
         // Legacy mode call - we can't fully support it without wallet address and chain ID which might be missing
         // But let's try to map what we can, or just return the old logic if we can't upgrade
         
         const balance = BigInt(params.userBalance || '0');
         const amount = BigInt(params.swapAmount || '0');
         // We'll perform basic math check here as fallback
         if (balance < amount) {
             return { isSufficient: false, message: 'Insufficient balance' };
         }
         return { isSufficient: true, message: 'Sufficient balance' };
    }

  return checkSufficientBalanceWithGas({
    ...params,
    estimatedGas: '0', // No gas check in legacy function
  });
};

/**
 * Fetch token balance (helper function)
 */
export const fetchTokenBalance = async (walletAddress, tokenAddress, chainId) => {
  try {
    const isNative = tokenAddress === NATIVE_TOKEN_ADDRESS || 
                     tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

    const balance = await fetchBalance(config, {
      address: walletAddress,
      token: isNative ? undefined : tokenAddress,
      chainId: chainId,
    });

    return {
      value: balance.value,
      formatted: formatUnits(balance.value, balance.decimals),
      decimals: balance.decimals,
      symbol: balance.symbol,
    };
  } catch (error) {
    logger.error('Failed to fetch token balance:', error);
    throw error;
  }
};

/**
 * Estimate total transaction cost (amount + gas)
 */
export const estimateTotalCost = async ({
  amount,
  decimals,
  isNative,
  route,
  chainId,
  gasPrice,
}) => {
  const amountWei = parseUnits(amount.toString(), decimals);
  const gasCost = await estimateSwapGasCost({ route, chainId, gasPrice });

  if (isNative) {
    const totalWei = amountWei + gasCost;
    return {
      total: formatUnits(totalWei, decimals),
      totalRaw: totalWei.toString(),
      amount: formatUnits(amountWei, decimals),
      gas: formatUnits(gasCost, 18),
    };
  }

  return {
    total: formatUnits(amountWei, decimals),
    totalRaw: amountWei.toString(),
    amount: formatUnits(amountWei, decimals),
    gas: formatUnits(gasCost, 18),
    gasToken: 'separate', // Indicates gas is paid in different token
  };
};

export default {
  checkSufficientBalanceWithGas,
  estimateSwapGasCost,
  getMinGasReserve,
  formatBalanceCheckForUI,
  checkSufficientBalance,
  fetchTokenBalance,
  estimateTotalCost,
};

// ✅ Alias for backward compatibility with useSwap.js import
export const estimateGasCost = estimateSwapGasCost;
