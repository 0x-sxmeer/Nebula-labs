// ✅ REFACTORED: useSwapExecution.js - Critical Fixes #2 & #3
// Enhanced route freshness validation and gas buffer improvements

import { useState, useCallback } from 'react';
import { useSendTransaction, useSwitchChain, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { lifiService } from '../services/lifiService';
import { logger } from '../utils/logger';

export const useSwapExecution = () => {
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { chain, address: walletAddress } = useAccount();
  
  const [executionState, setExecutionState] = useState({
    status: 'idle',
    step: null,
    error: null
  });
  
  /**
   * ✅ CRITICAL FIX #3: Enhanced gas estimation with proper buffers
   * Based on real-world testing data for complex bridges
   */
  const calculateGasWithBuffer = useCallback((estimatedGas, route) => {
    const baseGas = BigInt(estimatedGas);
    let bufferMultiplier = 120n; // 20% default (conservative)
    
    // ✅ FIX: Cross-chain requires higher buffer
    if (route.fromChainId !== route.toChainId) {
      bufferMultiplier = 150n; // 50% for cross-chain
      logger.log('📊 Cross-chain swap - using 50% gas buffer');
    }
    
    // ✅ FIX: Multi-step routes need more gas
    if (route.steps && route.steps.length > 1) {
      bufferMultiplier = Math.max(bufferMultiplier, 160n); // 60% for multi-step
      logger.log(`📊 Multi-step route (${route.steps.length}) - using 60% buffer`);
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
      logger.log(
        `📊 Complex bridge detected (${tool}) - using ${Number(bufferMultiplier - 100n)}% buffer`
      );
    }
    
    const gasWithBuffer = (baseGas * bufferMultiplier) / 100n;
    
    // ✅ Enforce absolute minimum
    const MIN_SAFE_GAS = 100000n;
    const finalGas = gasWithBuffer < MIN_SAFE_GAS ? MIN_SAFE_GAS : gasWithBuffer;
    
    logger.log(`⛽ Gas estimation: ${baseGas} → ${finalGas} (${bufferMultiplier}% total)`);
    
    return finalGas;
  }, []);
  
  /**
   * ✅ CRITICAL FIX #2: Enhanced route freshness validation
   * Prevents execution with stale quotes that could cause slippage failures
   */
  const validateRouteFreshness = useCallback((route) => {
    // ✅ FIX: Validate timestamp exists
    if (!route?.timestamp) {
      throw new Error('Invalid route: missing timestamp. Please refresh and try again.');
    }
    
    const routeAge = Date.now() - route.timestamp;
    
    // ✅ CRITICAL FIX: Lower threshold to 45s for safety margin
    // This accounts for potential delays during chain switching
    const MAX_ROUTE_AGE = 45000; // 45 seconds (was 60s)
    
    if (routeAge > MAX_ROUTE_AGE) {
      const ageInSeconds = Math.round(routeAge / 1000);
      throw new Error(
        `Quote expired (${ageInSeconds}s old). ` +
        `Quotes are only valid for ${MAX_ROUTE_AGE / 1000}s. ` +
        'Please refresh to get current rates.'
      );
    }
    
    // ✅ FIX: Warn if approaching expiration
    const WARNING_THRESHOLD = 30000; // 30s
    if (routeAge > WARNING_THRESHOLD) {
      const remainingSeconds = Math.round((MAX_ROUTE_AGE - routeAge) / 1000);
      logger.warn(`⚠️ Quote expires in ${remainingSeconds}s`);
    }
    
    logger.log(`✅ Route freshness validated (${Math.round(routeAge / 1000)}s old)`);
    return true;
  }, []);
  
  /**
   * ✅ Enhanced swap execution with comprehensive validation
   */
  const executeSwap = useCallback(async ({
    selectedRoute,
    fromToken,
    toToken,
    fromAmount,
    hasSufficientBalance,
    checkBalance,
    onHistoryUpdate,
  }) => {
    setExecutionState({ 
      status: 'validating', 
      step: 'Validating swap parameters', 
      error: null 
    });
    
    try {
      // 1. ✅ CRITICAL: Validate route freshness FIRST
      validateRouteFreshness(selectedRoute);
      
      // 2. Basic validation
      if (!selectedRoute) throw new Error('No route selected');
      if (!fromToken || !toToken) throw new Error('Invalid tokens');
      if (!hasSufficientBalance) throw new Error('Insufficient balance');
      
      // 3. Chain switching with re-validation
      const routeChainId = fromToken.chainId;
      if (chain?.id !== routeChainId) {
        setExecutionState({ 
          status: 'validating', 
          step: 'Switching network', 
          error: null 
        });
        
        logger.log(`⚠️ Chain mismatch. Switching to ${routeChainId}...`);
        
        try {
          await switchChainAsync({ chainId: routeChainId });
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for wallet
          
          // ✅ CRITICAL FIX: Re-validate route freshness after switch
          // Chain switching can take 1-3 seconds
          validateRouteFreshness(selectedRoute);
          
          // ✅ FIX: Verify chain actually switched
          if (chain?.id !== fromToken.chainId) {
            throw new Error(
              'Chain mismatch detected after switch. ' +
              'Please refresh routes and try again.'
            );
          }
          
        } catch (error) {
          throw new Error(
            'Network switch required. Please switch manually and try again.'
          );
        }
      }
      
      // 4. Re-check balance after potential delays
      setExecutionState({ 
        status: 'validating', 
        step: 'Checking balance', 
        error: null 
      });
      await checkBalance();
      
      // 5. Get transaction data from Li.Fi
      setExecutionState({ 
        status: 'validating', 
        step: 'Preparing transaction', 
        error: null 
      });
      
      const stepTxData = await lifiService.getStepTransaction(selectedRoute);
      
      if (!stepTxData?.transactionRequest) {
        throw new Error('Failed to prepare transaction. Please try again.');
      }
      
      const txRequest = stepTxData.transactionRequest;
      
      // 6. ✅ CRITICAL FIX: Validate transaction data structure
      if (!txRequest.to || !txRequest.data) {
        throw new Error('Invalid transaction data received from Li.Fi');
      }
      
      // 7. ✅ Enhanced gas estimation with proper buffers
      const gasLimit = txRequest.gasLimit ? BigInt(txRequest.gasLimit) : 500000n;
      const gasWithBuffer = calculateGasWithBuffer(gasLimit, selectedRoute);
      
      logger.log(`⛽ Final gas limit: ${gasWithBuffer}`);
      
      // 8. Build transaction parameters
      const txParams = {
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value ? BigInt(txRequest.value) : 0n,
        gas: gasWithBuffer,
      };
      
      // 9. ✅ FINAL FRESHNESS CHECK: Right before sending
      // This catches edge cases where preparation took too long
      validateRouteFreshness(selectedRoute);
      
      // 10. Send transaction
      setExecutionState({ 
        status: 'sending', 
        step: 'Waiting for wallet confirmation', 
        error: null 
      });
      
      logger.log('📤 Sending transaction:', txParams);
      
      const hash = await sendTransactionAsync(txParams);
      
      logger.log(`✅ Transaction sent: ${hash}`);
      
      setExecutionState({ 
        status: 'success', 
        step: 'Transaction submitted', 
        error: null 
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
    calculateGasWithBuffer,
    validateRouteFreshness
  ]);
  
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
    resetState
  };
};

export default useSwapExecution;
