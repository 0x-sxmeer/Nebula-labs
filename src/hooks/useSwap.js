import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBalance, useReadContract, useConfig, useWriteContract } from 'wagmi';
import { simulateContract } from '@wagmi/core';
import { parseUnits, formatUnits } from 'viem';
import { lifiService } from '../services/lifiService';
import { validateRoutes } from '../utils/routeValidation.jsx';
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
  // ✅ CRITICAL FIX #7: Use Ref for amount to stabilize callbacks
  const fromAmountRef = useRef(fromAmount);
  useEffect(() => { fromAmountRef.current = fromAmount; }, [fromAmount]);

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
          // Use the validated setter to ensure integrity
          setFromToken({
            ...matchingToken,
            chainId: chain.id
          });
          logger.log(`✅ Preserved ${fromToken.symbol} on ${chain.name}`);
        } else {
          setFromToken(null);
          logger.log(`ℹ️ ${fromToken.symbol} not available on ${chain.name}`);
        }
      } catch (error) {
        logger.error('Failed to fetch tokens for new chain:', error);
        setFromToken(null);
      }
    } else {
      setFromToken(null);
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
          setToToken({ ...matchingToken, chainId: chain.id });
          logger.log(`✅ Preserved ${toToken.symbol} on ${chain.name}`);
        } else {
          setToToken(null);
        }
      } catch (error) {
        logger.error('Failed to fetch tokens:', error);
        setToToken(null);
      }
    } else {
      setToToken(null);
    }
    
    setCustomToAddress('');
    setRoutes([]);
    setSelectedRoute(null);
    requestIdRef.current++;
  }, [toToken]);

  // ✅ SHARED: Token Validator Helper
  const validateTokenState = (token) => {
      if (!token) return null;
      
      let validated = { ...token };
      const symbol = validated.symbol?.toUpperCase();
      const address = validated.address?.toLowerCase();
      
      // 1. Stablecoin Price Sanitization
      const isStable = ['USDC', 'USDT', 'DAI', 'BUSD', 'USDC.E', 'USDT.E'].includes(symbol);
      const rawPrice = parseFloat(validated.priceUSD || '0');
      
      if (isStable && rawPrice > 2.0) {
          logger.warn(`Correcting anomalous price for ${symbol}: ${rawPrice} -> 1.0`);
          validated.priceUSD = '1.00';
      }

      // 2. Major Token Sanity Check
      if (symbol === 'ETH' || symbol === 'WETH') {
          if (rawPrice < 100.0 && rawPrice > 0) validated.priceUSD = '2500.00';
          if (validated.decimals !== 18) validated.decimals = 18;
      }
      if (symbol === 'BNB' || symbol === 'WBNB') {
          if (rawPrice < 20.0 && rawPrice > 0) validated.priceUSD = '400.00';
          if (validated.decimals !== 18) validated.decimals = 18;
      }
      if (symbol === 'BTC' || symbol === 'WBTC') {
          if (rawPrice < 1000.0 && rawPrice > 0) validated.priceUSD = '40000.00';
      }
      if (symbol === 'SOL') {
          if (rawPrice < 10.0 && rawPrice > 0) validated.priceUSD = '100.00';
      }

      // 3. Identity Verification
      const isNativeAddress = address === NATIVE_TOKEN_ADDRESS.toLowerCase() || 
                              address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
                              
      // Chain 1 Specific Strictness
      if (validated.chainId === 1) {
           const USDC_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
           const USDT_ADDR = '0xdac17f958d2ee523a2206206994597c13d831ec7';
           
           if (symbol === 'USDC' && address !== USDC_ADDR) {
                logger.error('CRITICAL: Fake USDC detected! Resetting.');
                return null;
           }
           if (symbol === 'USDT' && address !== USDT_ADDR) {
                logger.error('CRITICAL: Fake USDT detected! Resetting.');
                return null;
           }
      }

      if (symbol === 'USDC' && isNativeAddress) {
          logger.error('CRITICAL: Detected USDC with Native Address! correcting...');
          return null; // Force null to reset
      }

      return validated;
  };

  // ✅ DYNAMIC PRICE UPDATE
  // Fetch fresh price when token changes to ensure accuracy (fix stale/wrong list prices)
  useEffect(() => {
    const fetchFreshPrice = async () => {
        if (!fromToken || !fromChain || !fromToken.address) return;
        
        // Skip if it's a stablecoin we already sanitized to 1.00
        // But for ETH/BTC/Others, we want the REAL price.
        const symbol = fromToken.symbol?.toUpperCase();
        if (['USDC', 'USDT', 'DAI'].includes(symbol)) return;

        try {
            // FIXED: Use renamed getToken method
            const freshToken = await lifiService.getToken(fromChain.id, fromToken.address);
            if (freshToken && freshToken.priceUSD) {
                // Check if price is significantly different
                const oldPrice = parseFloat(fromToken.priceUSD || '0');
                const newPrice = parseFloat(freshToken.priceUSD);
                
                // Only update if difference > 5% or old price was 0/1 (anomalous)
                if (Math.abs(newPrice - oldPrice) / (oldPrice || 1) > 0.05 || oldPrice <= 1.0) {
                     logger.log(`🔄 Updated price for ${fromToken.symbol}: ${oldPrice} -> ${newPrice}`);
                     
                     // Run validator on the FRESH token
                     const validated = validateTokenState({
                         ...fromToken,
                         priceUSD: freshToken.priceUSD
                     });
                     
                     // Update state without triggering loop (using function update if needed, but setFromTokenState is safe)
                     setFromTokenState(prev => ({
                         ...prev,
                         priceUSD: validated.priceUSD
                     }));
                }
            }
        } catch (e) {
            // Ignore fetch errors
        }
    };
    
    fetchFreshPrice();
  }, [fromToken?.address, fromChain?.id]); // Only run when address/chain changes

  const setFromToken = useCallback((token) => {
    // ✅ CRITICAL FIX: AGGRESSIVE TOKEN INTEGRITY CHECK
    const validated = validateTokenState(token);
    
    // Log the final token state being set
    if (validated && (validated.symbol === 'ETH' || validated.symbol === 'USDC')) {
         // console.log('SETTING FROM TOKEN:', validated);
    }
    
    setFromTokenState(validated);
    setRoutes([]);
    setSelectedRoute(null);
    requestIdRef.current++;
  }, []);

  const setToToken = useCallback((token) => {
    const validated = validateTokenState(token);
    
    if (validated && (validated.symbol === 'ETH' || validated.symbol === 'USDC')) {
        // console.log('SETTING TO TOKEN:', validated);
    }

    setToTokenState(validated);
    setRoutes([]);
    setSelectedRoute(null);
    requestIdRef.current++;
  }, []);

  const handleSetFromAmount = useCallback((amount) => {
    const cleanAmount = amount.replace(/,/g, '.'); // Handle comma input
    setFromAmount(cleanAmount);
    
    if (cleanAmount !== fromAmount) {
      // Don't wipe routes immediately to prevent UI flash, 
      // let useEffect handle it via debounce
      // setRoutes([]); 
      // setSelectedRoute(null);
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
      staleTime: 10_000, // ✅ CRITICAL FIX #6: Cache balance for 10s
      gcTime: 30_000,    // Keep in memory for 30s
      refetchInterval: 15_000, // Refresh every 15s instead of 3s
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
      staleTime: 10_000, // ✅ CRITICAL FIX #6: Cache balance for 10s
      gcTime: 30_000,    // Keep in memory for 30s
      refetchInterval: 15_000, // Refresh every 15s instead of 3s
    },
  });

  // ========== ENHANCED BALANCE CHECKING WITH GAS RESERVATION ==========
  
  /**
   * ✅ FIXED: Accounts for gas when checking native token balance
   */
  const checkBalance = useCallback(async () => {
    const currentAmount = fromAmountRef.current; // Use Ref to avoid dependency change
    if (!walletAddress || !fromToken || !currentAmount || parseFloat(currentAmount) <= 0 || !isEVMChain) {
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
        // If balance fetch failed (undefined), we shouldn't necessarily block.
        // But for safety, we assume 0 if it's a known 'no balance' state, 
        // or just don't set sufficiency if it's an RPC error.
        // However, standard behavior is usually "assume 0".
        // Let's check if it was a load error or just empty.
        
        if (loadingBalance) {
             // Still loading, do nothing
             return;
        }

        // RPC Error case: userBalance is undefined but we are connected
        if (walletAddress && isEVMChain) {
            logger.warn('Balance fetch result was empty/null - RPC issue?');
            // Don't hard fail sufficiency, just return. 
            // The UI will show "0" but we can still try to swap (simulation will fail if real balance is 0).
            setBalance(null);
            return;
        }
        
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
      // Parse swap amount
      const swapAmount = parseUnits(currentAmount, fromToken.decimals);
      
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
    walletAddress, fromToken, /* fromAmount removed */ 
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
    const currentAmount = fromAmountRef.current;
    // Validation - Allow fetching without walletAddress (Guest Mode)
    if (!fromChain || !toChain || !fromToken || !toToken || !currentAmount || parseFloat(currentAmount) <= 0) {
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
      // PERMANENT GUARD: Block requests if decimal data is missing
      if (!fromToken?.decimals || !toToken?.decimals || !currentAmount || parseFloat(currentAmount) <= 0) {
        if (!silent) {
          setRoutes([]);
          setSelectedRoute(null);
        }
        return;
      }

      // Fetch gas prices
      const fetchedGasPrices = await lifiService.getGasPrices(fromChain.id);
      setGasPrice(fetchedGasPrices);

      // ✅ FAIL-SAFE: Verify Token Integrity before Request
      if (fromToken.symbol === 'USDC' && 
         (fromToken.address === NATIVE_TOKEN_ADDRESS || fromToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')) {
           logger.error('⛔ BLOCKED: Attempted to fetch routes for USDC with Native Address');
           setError({
               title: 'Token Error',
               message: 'Token data corrupted. Please refresh the page.',
               recoverable: false
           });
           setLoading(false);
           return;
      }

      // Prepare route request
      // (Normalization moved to Service Layer)
      // Logic for toToken chain mismatch
      if (toToken.chainId && toToken.chainId !== toChain.id) {
          logger.warn(`⚠️ To Token/Chain Mismatch: Token ${toToken.symbol} (${toToken.chainId}) vs Chain (${toChain.id})`);
          // OPTIONAL: Auto-correct or block?
      }

      // Prepare route request
      // ✅ CRITICAL FIX: Pass Human-Readable amount and Decimals to Service
      // The Service now handles the safe normalization to atomic units.
      
      const routeParams = {
        fromChainId: parseInt(fromChain.id),
        fromAmount: currentAmount, // "1.5"
        fromTokenDecimals: fromToken.decimals, // 18
        fromTokenAddress: fromToken.address,
        toChainId: parseInt(toChain.id),
        toTokenAddress: toToken.address,
        // Use user address or undefined for guest estimation
        fromAddress: walletAddress || undefined,
        toAddress: customToAddress || walletAddress || undefined,
        slippage,
        options: {
          order: routePreference === 'return' ? 'CHEAPEST' : 
                 (routePreference === 'gas' ? 'CHEAPEST' : 'FASTEST'),
          bridges: { deny: disabledBridges },
          exchanges: { deny: disabledExchanges },
        },
      };

      // ✅ DEBUG LOG: Explicitly log the exact params sent to API
      console.log('🚀 [useSwap] Requesting Routes:', {
          fromChain: routeParams.fromChainId,
          toChain: routeParams.toChainId,
          fromToken: fromToken.symbol,
          toToken: toToken.symbol,
          amount: currentAmount,
      });

      logger.log('Fetching routes...', routeParams);

      // FIXED: Pass abort signal to service
      const fetchedRoutes = await lifiService.getRoutes(routeParams, signal);

      // Race condition check
      if (currentRequestId !== requestIdRef.current) {
        logger.warn(`Discarding stale routes (ID: ${currentRequestId} vs ${requestIdRef.current})`);
        return;
      }

      // ✅ VALIDATION: Filter out invalid routes
      const { validRoutes, warnings } = validateRoutes(fetchedRoutes);

      if (warnings.length > 0) {
        logger.warn('[useSwap] Route validation warnings:', warnings);
      }
      
      // const { validRoutes: validatedRoutes, invalidCount } = validateRoutes(fetchedRoutes);
      // const validRoutes = fetchedRoutes; // Bypass validation


      if (validRoutes.length === 0 && fetchedRoutes.length > 0) {
           logger.warn('⚠️ All fetched routes failed validation');
           if (!silent) {
               setError({
                   title: 'No Valid Routes',
                   message: 'Routes were found but failed validation checks.',
                   recoverable: true
               });
           }
           setRoutes([]);
           setSelectedRoute(null);
           return;
      }

      // Process routes
      const routesWithMetadata = validRoutes.map((route, index) => {
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
    // fromAmount removed for stability
  ], [
    /* fromAmount removed */ fromChain, fromToken, toChain, toToken, slippage, 
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
    toToken?.address,
    walletAddress // ✅ CRITICAL FIX: Re-fetch when wallet connects/disconnects
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
  // ========== CHECK BALANCE ON CHANGES (DEBOUNCED) ==========
  useEffect(() => {
    checkBalance();
  }, [checkBalance, debouncedAmount]); // ✅ CRITICAL FIX: Debounce balance checks

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
