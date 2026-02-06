// ✅ REFACTORED: useSwap.js - Critical Fix #1
// Proper abort controller cleanup to prevent memory leaks and race conditions

import { useState, useEffect, useCallback, useRef } from 'react';
import { lifiService } from '../services/lifiService';
import { logger } from '../utils/logger';

export const useSwap = (walletAddress) => {
  // ... (all existing state declarations)
  
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  
  /**
   * ✅ CRITICAL FIX #1: Proper abort controller cleanup
   * Prevents memory leaks and race conditions from concurrent API calls
   */
  const fetchRoutes = useCallback(async (params) => {
    // ✅ FIX: Abort and cleanup previous request
    if (abortControllerRef.current) {
      logger.log('⏹️ Aborting previous quote request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null; // ✅ CRITICAL: Null out reference
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;
    
    setLoading(true);
    setError(null);
    
    try {
      logger.log('📡 Fetching routes with params:', params);
      
      const routesData = await lifiService.getRoutes(
        params, 
        abortControllerRef.current.signal // Pass abort signal
      );
      
      // ✅ FIX: Check if this request is still current
      if (currentRequestId !== requestIdRef.current) {
        logger.log('⚠️ Ignoring stale response');
        return; // Discard stale response
      }
      
      // ✅ FIX: Add timestamp to routes for freshness validation
      const routesWithTimestamp = routesData.map(route => ({
        ...route,
        timestamp: Date.now()
      }));
      
      setRoutes(routesWithTimestamp);
      setLoading(false);
      
      logger.log(`✅ Fetched ${routesData.length} routes`);
      
    } catch (error) {
      // ✅ FIX: Don't set error if request was aborted
      if (error.name === 'AbortError') {
        logger.log('🛑 Quote request aborted (expected)');
        return;
      }
      
      // Only set error if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        logger.error('❌ Error fetching routes:', error);
        setError(error.message);
        setRoutes([]);
      }
      
      setLoading(false);
    }
  }, []);
  
  /**
   * ✅ CRITICAL: Cleanup abort controller on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        logger.log('🧹 Cleanup: Aborting pending quote request');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);
  
  /**
   * ✅ FIX: Debounced route fetching with proper cleanup
   */
  const debounceTimerRef = useRef(null);
  
  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Validate inputs before fetching
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      setRoutes([]);
      setSelectedRoute(null);
      return;
    }
    
    // ✅ FIX: Increment request ID to invalidate in-flight requests
    requestIdRef.current++;
    
    // Debounce API call
    debounceTimerRef.current = setTimeout(() => {
      fetchRoutes({
        fromChainId: fromToken.chainId,
        fromTokenAddress: fromToken.address,
        fromAddress: walletAddress,
        fromAmount: parseUnits(fromAmount, fromToken.decimals).toString(),
        toChainId: toToken.chainId,
        toTokenAddress: toToken.address,
        toAddress: customToAddress || walletAddress,
        slippage,
      });
    }, 800);
    
    // ✅ CRITICAL: Cleanup debounce timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fromToken, toToken, fromAmount, slippage, walletAddress, customToAddress, fetchRoutes]);
  
  return {
    // ... all existing return values
    fetchRoutes, // Expose for manual refresh
  };
};

export default useSwap;
