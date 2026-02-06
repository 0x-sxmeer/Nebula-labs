import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBalance, useReadContract, useConfig, useWriteContract } from 'wagmi';
import { simulateContract } from '@wagmi/core';
import { parseUnits, formatUnits } from 'viem';
import { lifiService } from '../services/lifiService';
import { LIFI_CONFIG, NATIVE_TOKEN_ADDRESS, LARGE_CHAIN_ID_THRESHOLD } from '../config/lifi.config';
import { config } from '../config/wagmi.config';
import { parseApiError, LIFI_ERROR_CODES } from '../utils/errorHandler';
import { fetchTokenBalance, checkSufficientBalance, estimateGasCost } from '../utils/balanceChecker';
import { logger } from '../utils/logger';

const DEBOUNCE_DELAY = 500;
const REFRESH_INTERVAL = 30000;

export const useSwap = (walletAddress, currentChainId = 1, routePreference = 'CHEAPEST') => {

  const [fromChain, setFromChainState] = useState({ 
    id: 1, 
    name: 'Ethereum',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
  });
  
  const [toChain, setToChainState] = useState({ 
    id: 1, 
    name: 'Ethereum',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
  });
  
  const [fromToken, setFromTokenState] = useState({
    symbol: 'ETH',
    address: NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    chainId: 1,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    name: 'Ethereum',
    priceUSD: '0'
  });
  
  const [toToken, setToTokenState] = useState({
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chainId: 1,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    name: 'USD Coin',
    priceUSD: '1'
  });
  
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState(LIFI_CONFIG.defaultSlippage);

  // Route state
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Balance state
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [hasSufficientBalance, setHasSufficientBalance] = useState(true);
  
  // Gas price state
  const [gasPrice, setGasPrice] = useState(null);
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [customToAddress, setCustomToAddress] = useState('');
  
  // NEW: Execution tracking
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Tool filtering
  const [availableBridges, setAvailableBridges] = useState([]);
  const [availableExchanges, setAvailableExchanges] = useState([]);
  const [disabledBridges, setDisabledBridges] = useState([]);
  const [disabledExchanges, setDisabledExchanges] = useState([]);
  
  // Refs
  const debounceTimerRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  // Update ref on every render
  // No longer needed


  const { writeContractAsync } = useWriteContract();

  // ========== ENHANCED SETTERS WITH TOKEN PRESERVATION ==========
  
  /**
   * FIXED: Preserve token selection when switching chains
   */
  const setFromChain = useCallback(async (chain) => {
    setFromChainState(chain);
    
    // Try to preserve token if it exists on the new chain
    if (fromToken && chain?.id) {
      try {
        // First try cache, then fetch
        let tokensOnNewChain = lifiService.getTokensCached(chain.id);
        
        if (!tokensOnNewChain) {
          logger.log(`Fetching tokens for ${chain.name}...`);
          tokensOnNewChain = await lifiService.getTokens(chain.id);
        }
        
        // Look for matching token by symbol or address
        const matchingToken = tokensOnNewChain.find(t => 
          t.symbol.toLowerCase() === fromToken.symbol.toLowerCase() ||
          (t.address && fromToken.address && 
           t.address.toLowerCase() === fromToken.address.toLowerCase())
        );
        
        if (matchingToken) {
          setFromTokenState({
            ...matchingToken,
            chainId: chain.id
          });
          logger.log(`✅ Preserved ${fromToken.symbol} on ${chain.name}`);
        } else {
          setFromTokenState(null);
          logger.log(`ℹ️ ${fromToken.symbol} not available on ${chain.name}`);
        }
      } catch (error) {
        logger.error('Failed to fetch tokens for new chain:', error);
        setFromTokenState(null);
      }
    } else {
      setFromTokenState(null);
    }
    
    setBalance(null);
    setHasSufficientBalance(true);
    requestIdRef.current++;
  }, [fromToken]);

  const setToChain = useCallback(async (chain) => {
    setToChainState(chain);
    
    // Same logic as fromChain
    if (toToken && chain?.id) {
      try {
        let tokensOnNewChain = lifiService.getTokensCached(chain.id) ||
                               await lifiService.getTokens(chain.id);
        
        const matchingToken = tokensOnNewChain.find(t => 
          t.symbol.toLowerCase() === toToken.symbol.toLowerCase() ||
          (t.address && toToken.address && 
           t.address.toLowerCase() === toToken.address.toLowerCase())
        );
        
        if (matchingToken) {
          setToTokenState({ ...matchingToken, chainId: chain.id });
          logger.log(`✅ Preserved ${toToken.symbol} on ${chain.name}`);
        } else {
          setToTokenState(null);
        }
      } catch (error) {
        logger.error('Failed to fetch tokens:', error);
        setToTokenState(null);
      }
    } else {
      setToTokenState(null);
    }
    
    setCustomToAddress('');
    setRoutes([]);
    setSelectedRoute(null);
    requestIdRef.current++;
  }, [toToken]);

  const setFromToken = useCallback((token) => {
    setFromTokenState(token);
    setRoutes([]);
    setSelectedRoute(null);
    requestIdRef.current++;
  }, []);

  const setToToken = useCallback((token) => {
    setToTokenState(token);
    setRoutes([]);
    setSelectedRoute(null);
    requestIdRef.current++;
  }, []);

  const handleSetFromAmount = useCallback((amount) => {
    setFromAmount(amount);
    if (amount !== fromAmount) {
      setRoutes([]);
      setSelectedRoute(null);
      requestIdRef.current++;
    }
  }, [fromAmount]);

  // Wagmi hooks for balance
  const isEVMChain = fromChain?.id && fromChain.id < LARGE_CHAIN_ID_THRESHOLD;

  const { data: nativeBalance } = useBalance({
    address: walletAddress,
    chainId: isEVMChain ? fromChain.id : undefined,
    query: {
      enabled: !!walletAddress && !!isEVMChain,
    },
  });

  const { data: tokenBalance } = useReadContract({
    address: (fromToken && fromToken.address !== NATIVE_TOKEN_ADDRESS) ? fromToken.address : undefined,
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
    args: walletAddress ? [walletAddress] : undefined,
    chainId: isEVMChain ? fromChain.id : undefined,
    query: {
      enabled: !!walletAddress && !!isEVMChain && !!fromToken && fromToken.address !== NATIVE_TOKEN_ADDRESS,
    },
  });

  // ========== ENHANCED BALANCE CHECKING WITH GAS RESERVATION ==========
  
  /**
   * ✅ FIXED: Accounts for gas when checking native token balance
   */
  const checkBalance = useCallback(async () => {
    if (!walletAddress || !fromToken || !fromAmount || parseFloat(fromAmount) <= 0 || !isEVMChain) {
      setBalance(null);
      setHasSufficientBalance(true);
      return;
    }
    
    setLoadingBalance(true);
    
    try {
      const isNative = fromToken.address === NATIVE_TOKEN_ADDRESS || 
                       fromToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
      
      // Get user balance
      let userBalance;
      if (isNative) {
        userBalance = nativeBalance?.value;
      } else {
        userBalance = tokenBalance;
      }
      
      if (!userBalance) {
        setBalance(null);
        setHasSufficientBalance(false);
        setError({
          title: 'No Balance',
          message: `You don't have any ${fromToken.symbol}`,
          recoverable: true,
        });
        return;
      }
      
      // Format balance for display
      const balanceFormatted = formatUnits(userBalance, fromToken.decimals);
      setBalance({
        value: userBalance.toString(),
        formatted: balanceFormatted,
        decimals: fromToken.decimals,
        symbol: fromToken.symbol,
      });
      
      // Parse swap amount
      const swapAmount = parseUnits(fromAmount, fromToken.decimals);
      
      // ✅ CRITICAL FIX: For native tokens, reserve gas
      if (isNative) {
        // Estimate gas cost for the swap
        let estimatedGasInWei = BigInt(0);
        
        if (selectedRoute?.gasCosts?.[0]) {
          // Use route's gas estimate (most accurate)
          const gasAmount = selectedRoute.gasCosts[0].amount || '0';
          try {
            estimatedGasInWei = parseUnits(gasAmount, 18); // Gas is in native token (18 decimals)
          } catch (e) {
            logger.warn('Failed to parse gas from route, using fallback', e);
             // Fallback: Dynamic reservation
            const standardGasLimit = 300000n; // Standard swap gas limit
            const currentGasPrice = BigInt(gasPrice?.standard || 20000000000); // Default 20 gwei
            estimatedGasInWei = currentGasPrice * standardGasLimit;
          }
        } else {
            // Fallback: Dynamic reservation using fetched gas price
            // Min Reserve = CurrentGasPrice * 300000 * 1.5 (buffer)
            const standardGasLimit = 300000n; 
            const currentGasPrice = BigInt(gasPrice?.standard || 20000000000); // Default 20 gwei
            // 1.5 buffer applied here relative to base cost
            estimatedGasInWei = (currentGasPrice * standardGasLimit * 150n) / 100n;
        }
        
        // Add 20% buffer for gas price volatility
        const gasWithBuffer = (estimatedGasInWei * BigInt(120)) / BigInt(100);
        
        // Total needed: swap amount + gas
        const totalNeeded = swapAmount + gasWithBuffer;
        
        // Check if user has enough
        const sufficient = userBalance >= totalNeeded;
        setHasSufficientBalance(sufficient);
        
        if (!sufficient) {
          const shortfall = formatUnits(totalNeeded - userBalance, fromToken.decimals);
          const gasFormatted = formatUnits(gasWithBuffer, fromToken.decimals);
          
          setError({
            title: 'Insufficient Balance',
            message: `You need ${shortfall} more ${fromToken.symbol} for this swap.\n\n` +
                     `Breakdown:\n` +
                     `• Swap: ${fromAmount} ${fromToken.symbol}\n` +
                     `• Gas (estimated): ${gasFormatted} ${fromToken.symbol}\n` +
                     `• Total needed: ${formatUnits(totalNeeded, fromToken.decimals)} ${fromToken.symbol}\n` +
                     `• Your balance: ${balanceFormatted} ${fromToken.symbol}`,
            recoverable: true,
          });
        } else {
          setError(null);
        }
        
        // Update balance state with reserved gas info
        setBalance(prev => ({
            ...prev,
            reservedForGas: formatUnits(gasWithBuffer, 18)
        }));

        logger.log(`Balance check (native): ${balanceFormatted} ${fromToken.symbol}, ` +
                   `need ${formatUnits(totalNeeded, fromToken.decimals)} (incl. gas)`);
        
      } else {
        // ERC20 token - just check token balance (gas is paid in native token)
        const sufficient = userBalance >= swapAmount;
        setHasSufficientBalance(sufficient);
        
        if (!sufficient) {
          const shortfall = formatUnits(swapAmount - userBalance, fromToken.decimals);
          setError({
            title: 'Insufficient Balance',
            message: `You need ${shortfall} more ${fromToken.symbol}.\n\n` +
                     `Required: ${fromAmount} ${fromToken.symbol}\n` +
                     `Available: ${balanceFormatted} ${fromToken.symbol}`,
            recoverable: true,
          });
        } else {
          // Check if user has native token for gas
          if (nativeBalance?.value) {
            const nativeBalanceFormatted = formatUnits(nativeBalance.value, 18);
            const minGasRequired = parseUnits('0.001', 18); // Minimum 0.001 ETH for gas
            
            if (nativeBalance.value < minGasRequired) {
              setError({
                title: 'Low Gas Balance',
                message: `You may not have enough native tokens for gas fees.\n\n` +
                         `Current: ${nativeBalanceFormatted} (minimum ~0.001 recommended)`,
                recoverable: true,
              });
            } else {
              setError(null);
            }
          }
        }
        
        logger.log(`Balance check (ERC20): ${balanceFormatted} ${fromToken.symbol}, need ${fromAmount}`);
      }
      
    } catch (error) {
      logger.error('Balance check error:', error);
      setHasSufficientBalance(false);
      setError({
        title: 'Balance Check Failed',
        message: 'Could not verify your balance. Please try again.',
        recoverable: true,
      });
    } finally {
      setLoadingBalance(false);
    }
  }, [
    walletAddress, fromToken, fromAmount, 
    selectedRoute, fromChain, isEVMChain, setError
    // Removed nativeBalance/tokenBalance from dependencies to prevent loops
    // Accessed via ref instead
  ]);

  // Ref to hold latest balances for checkBalance
  const balancesRef = useRef({ nativeBalance, tokenBalance });
  useEffect(() => {
    balancesRef.current = { nativeBalance, tokenBalance };
  });

  // ========== CHECK BALANCE ON CHANGES ==========
  useEffect(() => {
    checkBalance();
  }, [
    checkBalance, 
    // Trigger on value changes, not object reference changes
    nativeBalance?.value, 
    tokenBalance?.value
  ]);
  
  /**
   * FIXED: Proper abort controller integration
   */
  const fetchRoutes = useCallback(async (silent = false) => {
    // Validation - Allow fetching without walletAddress (Guest Mode)
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      if (!silent) {
        setRoutes([]);
        setSelectedRoute(null);
      }
      return;
    }


    // ✅ CRITICAL FIX #1: Abort and cleanup previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null; // Prevent memory leaks
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    const currentRequestId = ++requestIdRef.current;

    if (!silent) {
      setLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Fetch gas prices
      const gasPrices = await lifiService.getGasPrices(fromChain.id);
      setGasPrice(gasPrices);

      // Prepare route request
      const amountInSmallestUnit = parseUnits(fromAmount, fromToken.decimals).toString();

      const routeParams = {
        fromChainId: fromChain.id,
        fromAmount: amountInSmallestUnit,
        fromTokenAddress: fromToken.address,
        toChainId: toChain.id,
        toTokenAddress: toToken.address,
        // Use user address or zero address for guest estimation
        fromAddress: walletAddress || '0x0000000000000000000000000000000000000000',
        toAddress: customToAddress || walletAddress || '0x0000000000000000000000000000000000000000',
        slippage,
        options: {
          order: routePreference === 'return' ? 'CHEAPEST' : 
                 (routePreference === 'gas' ? 'CHEAPEST' : 'FASTEST'),
          bridges: { deny: disabledBridges },
          exchanges: { deny: disabledExchanges },
        },
      };

      logger.log('Fetching routes...', routeParams);

      // FIXED: Pass abort signal to service
      const fetchedRoutes = await lifiService.getRoutes(routeParams, signal);

      // Race condition check
      if (currentRequestId !== requestIdRef.current) {
        logger.warn(`Discarding stale routes (ID: ${currentRequestId} vs ${requestIdRef.current})`);
        return;
      }

      // Process routes
      const routesWithMetadata = fetchedRoutes.map((route, index) => {
        const outputAmount = route.toAmount || '0';
        const outputFormatted = formatUnits(
          BigInt(outputAmount),
          toToken.decimals
        );
        
        // Calculate Gas Cost USD (Deep Aggregation)
        let gasCostUSD = 0;
        if (route.gasCosts && route.gasCosts.length > 0) {
             gasCostUSD = route.gasCosts.reduce((acc, cost) => acc + parseFloat(cost.amountUSD || 0), 0);
        } else {
             // Fallback: Aggregate from steps
             gasCostUSD = (route.steps || []).reduce((acc, step) => {
                 const stepGas = (step.estimate?.gasCosts || []).reduce((gAcc, gCost) => gAcc + parseFloat(gCost.amountUSD || 0), 0);
                 return acc + stepGas;
             }, 0);
        }
        
        // Calculate Provider Fees (Deep Aggregation for Tooltip)
        let allFees = route.fees || [];
        if (allFees.length === 0 && route.steps) {
             route.steps.forEach(step => {
                 if (step.estimate?.feeCosts) {
                     allFees = [...allFees, ...step.estimate.feeCosts];
                 }
             });
        }

        const outputUSD = parseFloat(route.toAmountUSD || '0');
        const netValue = Math.max(0, outputUSD - gasCostUSD).toFixed(2);

        return {
          ...route,
          isBest: index === 0,
          outputAmountFormatted: parseFloat(outputFormatted).toFixed(6),
          inputUSD: route.fromAmountUSD || '0',
          outputUSD: route.toAmountUSD || '0',
          priceImpact: route.priceImpact || 0,
          gasUSD: gasCostUSD.toFixed(2), // Fixed: Expose aggregated gasUSD
          netValue: netValue, // Fixed: Expose netValue
          fees: allFees, // Fixed: Expose aggregated fees
          timestamp: Date.now() // ✅ Added timestamp for validation
        };
      });

      setRoutes(routesWithMetadata);
      if (routesWithMetadata.length > 0) {
        setSelectedRoute(routesWithMetadata[0]);
      }
      setTimeLeft(30);

      logger.log(`✅ Fetched ${routesWithMetadata.length} routes`);

    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        logger.log('Route fetch aborted');
        return;
      }
      
      // ✅ ALWAYS check if this is still the current request
      if (currentRequestId !== requestIdRef.current) {
        logger.log('⏭️ Ignoring error from stale request');
        return;
      }
      
      logger.error('❌ Error fetching routes:', err);
      const parsedError = parseApiError(err);
      
      // Now safe to set error (only for latest request)
      if (!silent) {
        // Enhanced error messages with suggestions
        let suggestions = [];
        
        if (parsedError.code === LIFI_ERROR_CODES.NO_QUOTE) {
          if (parseFloat(fromAmount) < 1) {
            suggestions.push('Try increasing the swap amount (minimum ~$1 required)');
          }
          
          if (fromChain.id !== toChain.id) {
            suggestions.push(`Cross-chain routes may be limited`);
            suggestions.push(`Try swapping to ${toToken.symbol} on ${fromChain.name} first`);
          }
          
          if (parsedError.toolErrors?.some(e => e.code === 'INSUFFICIENT_LIQUIDITY')) {
            suggestions.push('This token pair has low liquidity');
            suggestions.push('Consider using a stablecoin (USDC/USDT) as intermediate step');
          }
        }
        
        setError({
          title: 'No Routes Available',
          message: parsedError.message,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
          recoverable: true,
        });
        // UX: Don't wipe routes on error to prevent flashing
        // setRoutes([]);
        // setSelectedRoute(null);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [
    fromAmount, fromChain, fromToken, toChain, toToken, slippage, 
    walletAddress, disabledBridges, disabledExchanges, customToAddress, 
    routePreference
  ]);

  // ========== DEBOUNCED AMOUNT LOGIC ==========
  // ========== DEPENDENCY BREAKING REF ==========
  // We use this to access the latest fetchRoutes without adding it to useEffect dependencies.
  // This prevents infinite loops if fetchRoutes creates a new identity on every render.
  const fetchRoutesRef = useRef(fetchRoutes);
  
  useEffect(() => {
    fetchRoutesRef.current = fetchRoutes;
  });

  // ========== DEBOUNCED AMOUNT LOGIC ==========
  // 1. Store debounced amount separately
  const [debouncedAmount, setDebouncedAmount] = useState(fromAmount);

  // 2. Update debounced amount with delay
  useEffect(() => {
    // Only log start if amount actually changed to something input-like
    if (fromAmount !== debouncedAmount) {
         // logger.log('⏳ Starting debounce timer for:', fromAmount);
    }
    const handler = setTimeout(() => {
      // logger.log('✅ Debounce timer finished. Setting debouncedAmount to:', fromAmount);
      setDebouncedAmount(fromAmount);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [fromAmount]);

  // 3. Fetch routes ONLY when valid triggers change
  useEffect(() => {
    // Skip if amount is invalid
    if (!debouncedAmount || parseFloat(debouncedAmount) <= 0) {
      setRoutes([]);
      setSelectedRoute(null);
      setError(null);
      return;
    }

    // Call the latest fetchRoutes safely
    if (fetchRoutesRef.current) {
        fetchRoutesRef.current(false);
    }

  }, [
    debouncedAmount, 
    fromChain?.id, 
    toChain?.id, 
    fromToken?.address, 
    toToken?.address
  ]);

  // ========== FIXED AUTO-REFRESH (DON'T REFRESH DURING EXECUTION) ==========
  useEffect(() => {
    // Don't auto-refresh if:
    // 1. Auto-refresh is disabled
    // 2. Currently executing a swap
    if (!autoRefresh || isExecuting) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      return;
    }

    // Countdown timer
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    // Silent refresh interval
    refreshIntervalRef.current = setInterval(() => {
      // Modified: Allow refresh without wallet
      if (fromAmount && parseFloat(fromAmount) > 0 && !loading) {
        fetchRoutes(true); // Silent refresh
      }
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(timerIntervalRef.current);
      clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh, isExecuting, fromAmount, walletAddress, loading]);

  // ========== CHECK BALANCE ON CHANGES ==========
  useEffect(() => {
    checkBalance();
  }, [checkBalance]);

  // ========== FETCH AVAILABLE TOOLS ==========
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const { bridges, exchanges } = await lifiService.getTools();
        setAvailableBridges(bridges || []);
        setAvailableExchanges(exchanges || []);
      } catch (error) {
        logger.error('Failed to fetch tools:', error);
      }
    };
    
    fetchTools();
  }, []);

  // ========== CLEANUP ON UNMOUNT ==========
  // ✅ CRITICAL FIX #1: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        logger.log('🧹 Cleaned up pending route requests');
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // ========== ACTIONS ==========
  
  const switchTokens = useCallback(() => {
    const tempToken = fromToken;
    const tempChain = fromChain;
    
    setFromTokenState(toToken);
    setToTokenState(tempToken);
    setFromChainState(toChain);
    setToChainState(tempChain);
    
    setCustomToAddress('');
    setRoutes([]);
    setSelectedRoute(null);
    requestIdRef.current++;
  }, [fromToken, toToken, fromChain, toChain]);

  const executeSwap = useCallback(async () => {
    if (!selectedRoute) throw new Error('No route selected');
    if (!walletAddress) throw new Error('Wallet not connected');
    if (!hasSufficientBalance) throw new Error('Insufficient balance');

    logger.log('Executing swap with route:', selectedRoute);
    return selectedRoute;
  }, [selectedRoute, walletAddress, hasSufficientBalance]);

  return useMemo(() => ({
    // State
    fromChain,
    toChain,
    fromToken,
    toToken,
    fromAmount,
    slippage,
    routes,
    selectedRoute,
    loading,
    isRefreshing,
    loadingBalance,
    error,
    autoRefresh,
    timeLeft,
    balance,
    hasSufficientBalance,
    gasPrice,
    availableBridges,
    availableExchanges,
    disabledBridges,
    disabledExchanges,
    customToAddress,
    isExecuting,

    // Setters
    setFromChain,
    setToChain,
    setFromToken,
    setToToken,
    setFromAmount: handleSetFromAmount,
    setSlippage,
    setSelectedRoute,
    setAutoRefresh,
    setDisabledBridges,
    setDisabledExchanges,
    setCustomToAddress,
    setIsExecuting,

    // Actions
    switchTokens,
    refreshRoutes: fetchRoutes,
    executeSwap,
    checkBalance,
  }), [
    fromChain, toChain, fromToken, toToken, fromAmount, slippage, routes, selectedRoute,
    loading, isRefreshing, loadingBalance, error, autoRefresh, timeLeft, balance,
    hasSufficientBalance, gasPrice, availableBridges, availableExchanges,
    disabledBridges, disabledExchanges, customToAddress, isExecuting,
    setFromChain, setToChain, setFromToken, setToToken, handleSetFromAmount,
    switchTokens, fetchRoutes, executeSwap, checkBalance
  ]);
};

export default useSwap;
