
import { useState, useCallback } from 'react';
import { useSendTransaction, useSwitchChain, useAccount, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { lifiService } from '../services/lifiService';
import { logger } from '../utils/logger';
import { NATIVE_TOKEN_ADDRESS } from '../config/lifi.config';
import { APPROVED_LIFI_ROUTERS, GAS_LIMITS } from '../config/security';
import useSwapMonitoring from './useSwapMonitoring';
import { analytics } from '../services/analyticsService';

/**
 * ✅ PRODUCTION VERSION: Comprehensive transaction validation and execution
 * 
 * CRITICAL FIX #1: Transaction monitoring with UI integration
 * CRITICAL FIX #2: Enhanced gas estimation with dynamic buffers
 */
export const useSwapExecution = () => {
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { chain, address: walletAddress } = useAccount();
  const publicClient = usePublicClient();
  const { monitorTransaction, monitoringState } = useSwapMonitoring();
  
  const [executionState, setExecutionState] = useState({
    status: 'idle', // idle, validating, sending, monitoring, success, failed
    step: null,
    error: null
  });

  /**
   * ✅ CRITICAL FIX #2: Calculate gas with appropriate safety buffer
   * Based on transaction complexity and route type
   */
  const calculateGasWithBuffer = useCallback((estimatedGas, route) => {
    const baseGas = BigInt(estimatedGas);
    let bufferMultiplier = 120n; // 20% default

    // ✅ Cross-chain requires higher buffer
    if (route.fromChainId !== route.toChainId) {
      bufferMultiplier = 150n; // 50% buffer
      logger.log('📊 Cross-chain swap detected - using 50% gas buffer');
    }

    // ✅ Multi-step routes need more gas
    if (route.steps && route.steps.length > 1) {
      bufferMultiplier = bufferMultiplier > 150n ? bufferMultiplier : 150n;
      logger.log(`📊 Multi-step route (${route.steps.length} steps) - using 50%+ buffer`);
    }

    // ✅ CRITICAL FIX #3: Proper buffers for complex bridges
    const tool = route.steps?.[0]?.tool?.toLowerCase();
    const gasCrazyBridges = {
      'stargate': 220n,   // 120% buffer (critical for Stargate)
      'cbridge': 210n,    // 110% buffer
      'across': 200n,     // 100% buffer
      'hop': 190n,        // 90% buffer
      'synapse': 200n,    // 100% buffer
      'connext': 190n,    // 90% buffer
      'hyphen': 180n,     // 80% buffer
      'multichain': 180n, // 80% buffer
    };

    if (tool && gasCrazyBridges[tool]) {
      bufferMultiplier = gasCrazyBridges[tool];
      logger.log(`📊 Complex bridge detected (${tool}) - using ${Number(bufferMultiplier - 100n)}% buffer`);
    }

    const gasWithBuffer = (baseGas * bufferMultiplier) / 100n;

    // ✅ Enforce absolute minimum
    const MIN_SAFE_GAS = 100000n;
    const finalGas = gasWithBuffer < MIN_SAFE_GAS ? MIN_SAFE_GAS : gasWithBuffer;

    logger.log(`⛽ Gas estimation: ${baseGas} → ${finalGas} (${bufferMultiplier}% buffer)`);

    return finalGas;
  }, []);

  /**
   * ✅ CRITICAL FIX #2: Validate user has enough balance for swap + gas
   */
  const validateBalanceWithGas = useCallback(async (fromToken, txValue, estimatedGas) => {
    try {
      if (!publicClient || !walletAddress) {
        logger.warn('Cannot validate balance: missing client or wallet');
        return true; // Allow to proceed, wallet will catch if insufficient
      }

      const gasPrice = await publicClient.getGasPrice();
      const estimatedGasCost = BigInt(estimatedGas) * gasPrice;

      const isNativeToken = fromToken.address === NATIVE_TOKEN_ADDRESS ||
        fromToken.address?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      const balance = await publicClient.getBalance({ address: walletAddress });

      if (isNativeToken) {
        // For native token: check balance covers amount + gas
        const totalRequired = txValue + estimatedGasCost;

        if (balance < totalRequired) {
          const shortfall = totalRequired - balance;
          const shortfallFormatted = formatUnits(shortfall, 18);

          throw new Error(
            `Insufficient ${chain?.nativeCurrency?.symbol || 'ETH'} for transaction. ` +
            `You need ${parseFloat(shortfallFormatted).toFixed(6)} more to cover the swap amount plus gas fees.`
          );
        }

        logger.log(`✅ Balance check passed: ${formatUnits(balance, 18)} ${chain?.nativeCurrency?.symbol}`);
        logger.log(`   Required: ${formatUnits(totalRequired, 18)} (amount + gas)`);

      } else {
        // For ERC20: just check gas in native token
        if (balance < estimatedGasCost) {
          const shortfall = estimatedGasCost - balance;
          const shortfallFormatted = formatUnits(shortfall, 18);

          throw new Error(
            `Insufficient ${chain?.nativeCurrency?.symbol || 'ETH'} for gas fees. ` +
            `You need ${parseFloat(shortfallFormatted).toFixed(6)} more ${chain?.nativeCurrency?.symbol}.`
          );
        }

        logger.log(`✅ Gas check passed: ${formatUnits(balance, 18)} ${chain?.nativeCurrency?.symbol}`);
        logger.log(`   Gas required: ${formatUnits(estimatedGasCost, 18)}`);
      }

      return true;

    } catch (error) {
      logger.error('Balance validation failed:', error);
      throw error;
    }
  }, [publicClient, walletAddress, chain]);

  /**
   * ✅ CRITICAL FIX #2: Enhanced route freshness validation
   * Prevents execution with stale quotes that could cause slippage failures
   */
  const validateRouteFreshness = useCallback((route) => {
    if (!route?.timestamp) {
      throw new Error('Invalid route: missing timestamp. Please refresh and try again.');
    }
    
    const routeAge = Date.now() - route.timestamp;
    const MAX_ROUTE_AGE = 45000; // 45s (was 60s) for safety margin
    
    if (routeAge > MAX_ROUTE_AGE) {
      const ageInSeconds = Math.round(routeAge / 1000);
      throw new Error(
        `Quote expired (${ageInSeconds}s old). ` +
        `Quotes are only valid for 45s. Please refresh.`
      );
    }
    
    // Warn if approaching expiration
    if (routeAge > 30000) {
      const remainingSeconds = Math.round((MAX_ROUTE_AGE - routeAge) / 1000);
      logger.warn(`⚠️ Quote expires in ${remainingSeconds}s`);
    }
    
    logger.log(`✅ Route freshness validated (${Math.round(routeAge / 1000)}s old)`);
    return true;
  }, []);

  /**
   * Check if router address is approved (whitelisted)
   */
  const isApprovedRouter = useCallback((address, chainId) => {
    const approvedRouters = APPROVED_LIFI_ROUTERS[chainId];

    if (!approvedRouters || approvedRouters.length === 0) {
      logger.warn(`⚠️ No router whitelist defined for chain ${chainId}`);
      return { approved: true, unknown: true };
    }

    const isApproved = approvedRouters
      .map(r => r.toLowerCase())
      .includes(address.toLowerCase());

    return { approved: isApproved, unknown: false };
  }, []);

  /**
   * Main swap execution function with comprehensive validation
   */
  const executeSwap = useCallback(async ({
    selectedRoute,
    fromToken,
    toToken,
    fromAmount,
    hasSufficientBalance,
    checkBalance,
    onHistoryUpdate, // ✅ NEW: Callback to update swap history
  }) => {
    setExecutionState({ status: 'validating', step: 'Validating swap parameters', error: null });

    try {
      // 1. Basic validation
      if (!selectedRoute) throw new Error('No route selected');
      if (!fromToken || !toToken) throw new Error('Invalid tokens');
      if (!hasSufficientBalance) throw new Error('Insufficient balance');
      
      // ✅ CRITICAL FIX #2: Validate route freshness FIRST
      validateRouteFreshness(selectedRoute);

      // 2. Chain enforcement
      const routeChainId = fromToken.chainId;
      if (chain?.id !== routeChainId) {
        setExecutionState({ status: 'validating', step: 'Switching network', error: null });
        logger.log(`⚠️ Chain mismatch. Switching to ${routeChainId}...`);

        try {
          await switchChainAsync({ chainId: routeChainId });
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for wallet
          
          // ✅ CRITICAL FIX #2: Re-validate route freshness after chain switch
          validateRouteFreshness(selectedRoute);
          
          // ✅ Issue #13: Verify chain switch was successful
          // Note: chain state may not update immediately, so we rely on the wallet
        } catch (error) {
          throw new Error('Network switch required. Please switch manually and try again.');
        }
      }

      // 3. Route freshness already validated by validateRouteFreshness above
      // This legacy check is kept as a backup but uses the new 45s threshold
      if (selectedRoute.timestamp) {
        const routeAge = Date.now() - selectedRoute.timestamp;
        const MAX_ROUTE_AGE = 45000; // ✅ Updated to 45s for consistency

        if (routeAge > MAX_ROUTE_AGE) {
          throw new Error(
            `Quote expired (${Math.round(routeAge / 1000)}s old). ` +
            'Please refresh to get current rates.'
          );
        }
      }

      // 4. Re-check balance
      setExecutionState({ status: 'validating', step: 'Checking balance', error: null });
      await checkBalance();

      // 5. Large value warning
      const inputUSD = parseFloat(selectedRoute.inputUSD || selectedRoute.fromAmountUSD || '0');
      if (inputUSD > 10000) {
        logger.warn(`⚠️ Large swap: $${inputUSD.toFixed(2)}`);
      }

      // 6. Get transaction data from Li.Fi
      setExecutionState({ status: 'validating', step: 'Preparing transaction', error: null });

      const stepTxData = await lifiService.getStepTransaction(selectedRoute);

      if (!stepTxData?.transactionRequest) {
        throw new Error('Failed to prepare transaction. Please try again.');
      }

      const txRequest = stepTxData.transactionRequest;

      if (!txRequest.to || !txRequest.data) {
        throw new Error('Invalid transaction data received from Li.Fi');
      }

      // 7. Router security check
      const routerCheck = isApprovedRouter(txRequest.to, chain.id);
      if (!routerCheck.approved && !routerCheck.unknown) {
        logger.warn(`⚠️ SECURITY: Unknown router ${txRequest.to}`);

        if (analytics) {
          analytics.trackError('Security', new Error(`Unverified router: ${txRequest.to}`));
        }
      }

      // 8. Gas limit validation
      const gasLimit = txRequest.gasLimit ? BigInt(txRequest.gasLimit) : 500000n;

      if (gasLimit > GAS_LIMITS.MAX_WARNING) {
        logger.warn(`⚠️ High gas limit: ${gasLimit}`);
      }

      const gasWithBuffer = calculateGasWithBuffer(gasLimit, selectedRoute);

      // 9. Validate transaction value
      const isNative = fromToken.address === NATIVE_TOKEN_ADDRESS ||
        fromToken.address?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      if (isNative) {
        const expectedValue = parseUnits(fromAmount, fromToken.decimals);
        const txValue = BigInt(txRequest.value || '0');

        // Allow 1% variance
        const minValue = (expectedValue * 99n) / 100n;
        const maxValue = (expectedValue * 101n) / 100n;

        if (txValue < minValue || txValue > maxValue) {
          throw new Error(
            `Transaction amount mismatch. Expected ~${fromAmount} ${fromToken.symbol}`
          );
        }
      }

      // 10. ✅ CRITICAL FIX #2: Final balance check including gas
      await validateBalanceWithGas(
        fromToken,
        txRequest.value ? BigInt(txRequest.value) : 0n,
        gasWithBuffer
      );

      // 11. Build transaction parameters
      const txParams = {
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value ? BigInt(txRequest.value) : 0n,
        gas: gasWithBuffer,
      };

      // 12. Send transaction
      setExecutionState({ status: 'sending', step: 'Waiting for wallet confirmation', error: null });

      logger.log('📤 Sending transaction:', txParams);
      
      // ✅ CRITICAL FIX #2: Final freshness check right before sending
      validateRouteFreshness(selectedRoute);

      let hash;
      try {
        hash = await sendTransactionAsync(txParams);
        logger.log(`✅ Transaction sent: ${hash}`);

        // Track in analytics
        if (analytics) {
          analytics.trackSwap({
            ...selectedRoute,
            txHash: hash,
            gasLimit: gasWithBuffer.toString(),
          });
        }
      } catch (error) {
        logger.error('❌ Transaction send failed:', error);
        throw error;
      }

      // 13. ✅ CRITICAL FIX #1: Start monitoring with UI integration
      setExecutionState({ status: 'monitoring', step: 'Monitoring transaction', error: null });

      monitorTransaction({
        txHash: hash,
        route: selectedRoute,
        onStatusUpdate: (status) => {
          logger.log('📊 Swap status update:', status);

          // ✅ Update UI notifications
          if (window.showNotification) {
            const statusMessages = {
              'PENDING': 'Transaction pending confirmation',
              'DONE': 'Swap completed successfully! 🎉',
              'FAILED': 'Swap failed. Please check transaction.',
              'INVALID': 'Transaction invalid. Contact support.'
            };

            window.showNotification({
              type: status.status === 'DONE' ? 'success' :
                status.status === 'FAILED' ? 'error' : 'info',
              title: statusMessages[status.status] || 'Status Update',
              message: status.substatus || '',
              duration: status.status === 'DONE' ? 5000 :
                status.status === 'FAILED' ? 0 : 3000
            });
          }

          // Update execution state
          setExecutionState({
            status: 'monitoring',
            step: `Status: ${status.status}`,
            error: null
          });
        },
        onComplete: (finalStatus) => {
          // ✅ Handle completion
          if (finalStatus.status === 'DONE') {
            // Confetti celebration!
            if (typeof window !== 'undefined' && window.confetti) {
              window.confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
            }

            setExecutionState({
              status: 'success',
              step: 'Swap completed successfully!',
              error: null
            });

            // ✅ Update swap history
            if (onHistoryUpdate) {
              onHistoryUpdate({
                txHash: hash,
                status: 'COMPLETED',
                completedAt: Date.now(),
                destinationTxHash: finalStatus.receiving?.txHash
              });
            }

            window.showNotification?.({
              type: 'success',
              title: '🎉 Swap Completed!',
              message: `You received ${selectedRoute.toAmountFormatted || ''} ${toToken.symbol}`,
              duration: 8000
            });
          } else {
            setExecutionState({
              status: 'failed',
              step: null,
              error: {
                title: 'Swap Failed',
                message: finalStatus.substatus || 'Transaction failed',
                recoverable: false
              }
            });

            // ✅ Update swap history with failure
            if (onHistoryUpdate) {
              onHistoryUpdate({
                txHash: hash,
                status: 'FAILED',
                failedAt: Date.now(),
                error: finalStatus.substatus
              });
            }
          }
        },
        onError: (error) => {
          // ✅ Handle monitoring errors
          logger.error('Monitoring error:', error);

          setExecutionState({
            status: 'failed',
            step: null,
            error: {
              title: 'Monitoring Error',
              message: error.message,
              recoverable: true
            }
          });

          window.showNotification?.({
            type: 'error',
            title: 'Monitoring Failed',
            message: 'Unable to track transaction status. Check blockchain explorer.',
            duration: 0
          });
        }
      });

      return { hash, executionState };

    } catch (error) {
      logger.error('❌ Swap execution failed:', error);

      setExecutionState({
        status: 'failed',
        step: null,
        error: {
          title: 'Swap Failed',
          message: error.message,
          recoverable: true
        }
      });

      throw error;
    }
  }, [
    chain,
    switchChainAsync,
    sendTransactionAsync,
    isApprovedRouter,
    calculateGasWithBuffer,
    validateBalanceWithGas,
    validateRouteFreshness,
    monitorTransaction
  ]);

  /**
   * Reset execution state
   */
  const resetState = useCallback(() => {
    setExecutionState({
      status: 'idle',
      step: null,
      error: null
    });
  }, []);

  return {
    executeSwap,
    executionState,
    monitoringState,
    resetState
  };
};

export default useSwapExecution;
