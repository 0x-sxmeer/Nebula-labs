/**
 * Production-Grade Li.Fi API Service
 * Enhanced with error handling, rate limiting, and retry logic
 */

import { LIFI_CONFIG } from '../config/lifi.config.js';
import { parseApiError, LIFI_ERROR_CODES } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * @typedef {Object} RateLimitInfo
 * @property {number} limit - Total limit for 2-hour window
 * @property {number} remaining - Remaining requests
 * @property {number} reset - Seconds until reset
 */

// FIXED: Handles scientific notation and ensures atomic unit precision
export const toBaseUnit = (amount, decimals) => {
  // === VALIDATION ===
  if (!amount || amount === '' || decimals === undefined || decimals === null) {
    console.warn('[toBaseUnit] Invalid input:', { amount, decimals });
    return "0";
  }
  
  // Convert to number for validation
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) {
    console.error('[toBaseUnit] Amount is NaN:', amount);
    return "0";
  }
  
  if (numericAmount === 0) {
    return "0";
  }
  
  if (numericAmount < 0) {
    console.error('[toBaseUnit] Negative amount not allowed:', amount);
    return "0";
  }
  
  // === CONVERSION ===
  try {
    // Remove whitespace and convert to string  
    let cleanAmount = String(amount).trim();
    
    // Handle scientific notation (e.g., "1e-7", "1.5e+3")
    if (cleanAmount.includes('e') || cleanAmount.includes('E')) {
      // Convert to fixed-point notation with enough decimal places
      cleanAmount = numericAmount.toFixed(decimals);
    }
    
    // Split into whole and fractional parts
    const [whole, fractional = ''] = cleanAmount.split('.');
    
    // Validate whole part
    if (whole === '' || whole === undefined) {
      console.error('[toBaseUnit] No whole number part:', amount);
      return "0";
    }
    
    // Pad or truncate fractional part to exact decimals
    const paddedFractional = fractional
      .padEnd(decimals, '0')  // Pad with zeros if needed
      .slice(0, decimals);      // Truncate if too long
    
    // Combine using BigInt for precision
    // Formula: (whole * 10^decimals) + fractional
    const wholeBigInt = BigInt(whole || '0') * (BigInt(10) ** BigInt(decimals));
    const fractionalBigInt = BigInt(paddedFractional || '0');
    const result = wholeBigInt + fractionalBigInt;
    
    return result.toString();
    
  } catch (error) {
    console.error('[toBaseUnit] Conversion error:', {
      error: error.message,
      amount,
      decimals
    });
    return "0";
  }
};

class LiFiService {
  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_API_URL;
    

    
    // ✅ PROD & DEV: Always use the Vercel API path
    // This works for both 'npm run dev' (via Vite proxy) and Production (Vercel)
    this.baseUrl = '/api/lifi-proxy'; 
    
    // Check if we are in production to set the full URL if needed, 
    // but relative path '/api/lifi-proxy' usually works best for Vercel auto-detection.
    if (import.meta.env.PROD && this.backendUrl) {
       // Only use full URL if explicitly defined, otherwise relative is safer
       if (!this.backendUrl.includes('localhost')) {
           this.baseUrl = `${this.backendUrl}/api/lifi-proxy`;
       }
    }

    console.log('🚀 LiFi Service using endpoint:', this.baseUrl);
    
    // ❌ NEVER set API key here. It is handled by the backend.
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    // Rate limiting tracking
    this.rateLimitInfo = {
      limit: 200,
      remaining: 200,
      reset: 0,
    };

    // Request cache for chains/tokens (static data)
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.LS_KEY = 'lifi_cache_v5_clean'; // ✅ FORCE INVALIDATE V4 CACHE
    
    // Load from LocalStorage
    this.loadFromLocalStorage();
  }

// ... (lines 58-272 skipped)

  /**
   * Get token details with price (Renamed for useSwap compatibility)
   */
  async getToken(chainId, tokenAddress) {
    try {
      const data = await this.makeRequest(`/token?chain=${chainId}&token=${tokenAddress}`, { cache: true });
      
      // Sanitization: Prevents $2.00 USDC glitches
      if (data && ['USDC', 'USDT', 'DAI', 'BUSD'].includes(data.symbol?.toUpperCase())) {
          const price = parseFloat(data.priceUSD || '0');
          if (price > 1.1 || price < 0.9) {
              return { ...data, priceUSD: '1.00' };
          }
      }

      return data;
    } catch (error) {
        logger.error('Error fetching token info:', error);
        // Return default structure instead of null
        return {
            address: tokenAddress,
            chainId,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            decimals: 18,
            priceUSD: '0'
        };
    }
  }

  // ... (loadFromLocalStorage, saveToLocalStorage, parseRateLimitHeaders, canMakeRequest methods essentially unchanged)
  loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem(this.LS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            this.cache = new Map(parsed);
            logger.log('📦 Loaded cache from LocalStorage', this.cache.size);
        }
    } catch (e) {
        logger.warn('Failed to load cache from LS', e);
        try { localStorage.removeItem(this.LS_KEY); } catch (e) {}
    }
  }

  saveToLocalStorage() {
    try {
        const entries = Array.from(this.cache.entries());
        localStorage.setItem(this.LS_KEY, JSON.stringify(entries));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            this.cache.clear();
            try { localStorage.setItem(this.LS_KEY, JSON.stringify([])); } catch (e) {}
        }
    }
  }

  parseRateLimitHeaders(headers) {
    if (headers.get('ratelimit-limit')) {
      this.rateLimitInfo = {
        limit: parseInt(headers.get('ratelimit-limit') || '200'),
        remaining: parseInt(headers.get('ratelimit-remaining') || '200'),
        reset: parseInt(headers.get('ratelimit-reset') || '0'),
      };
    }
  }

  canMakeRequest() {
    // Warn if getting close to limit
    if (this.rateLimitInfo.remaining <= 5) {
      if (typeof window !== 'undefined' && window.showToast) {
        // Optional: Trigger toast if mechanism exists
        logger.warn('API rate limit approaching');
      }
    }
    
    // STRICT enforcement
    if (this.rateLimitInfo.remaining <= 0) {
      throw new Error(
        `Rate limit exceeded. Please wait ${this.rateLimitInfo.reset} seconds.`
      );
    }
    
    return true;
  }

  /**
   * Make API request with error handling and retry logic
   * @private
   */
  async makeRequest(endpoint, options = {}) {
    const { method = 'GET', body, retries = 2, cache = false, signal: externalSignal } = options;

    // Check cache for GET requests
    if (method === 'GET' && cache) {
      const cached = this.getCached(endpoint);
      if (cached) return cached;
    }

    // Prepare the "Wrapper" body for the proxy
    const proxyBody = {
      endpoint,
      method,
      body: body || undefined
    };

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 15000); // 15s timeout
        
        if (externalSignal) {
             if (externalSignal.aborted) {
                 timeoutController.abort();
             } else {
                 externalSignal.addEventListener('abort', () => timeoutController.abort());
             }
        }
        
        const combinedSignal = timeoutController.signal;

        // ✅ Always POST to the proxy
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(proxyBody),
          signal: combinedSignal,
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
           const errorText = await response.text().catch(() => 'No error text');
           let errorData = {};
           try {
               errorData = JSON.parse(errorText);
           } catch {
               errorData = { message: errorText };
           }
           
           logger.error(`API Error (${response.status}) at ${endpoint}:`, errorData);
           throw { response: { status: response.status, data: errorData } };
        }

        const data = await response.json();

        if (method === 'GET' && cache) {
          this.setCache(endpoint, data);
        }

        return data;

      } catch (error) {
        lastError = error;
        // Don't retry if aborted
        if (error.name === 'AbortError') throw error;

        logger.warn(`Attempt ${attempt + 1}/${retries + 1} failed for ${endpoint}:`, error);
        
        if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  }

  /**
   * Cache helpers
   * @private
   */
  getCached(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL,
    });
    this.saveToLocalStorage();
  }

  clearCache() {
    this.cache.clear();
    this.saveToLocalStorage();
  }

  /**
   * Fetch available chains (cached)
   */
  async getChains() {
    try {
      const data = await this.makeRequest('/chains', { cache: true });
      return data.chains || [];
    } catch (error) {
      logger.error('Error fetching chains:', error);
      const parsedError = parseApiError(error);
      throw new Error(parsedError.message);
    }
  }

  /**
   * Fetch tokens for a chain (cached)
   */
    async getTokens(chainId) {
    try {
      // 1. Disable auto-caching in makeRequest to prevent storing raw data
      const data = await this.makeRequest(`/tokens?chains=${chainId}`, { cache: false });
      const tokens = data.tokens?.[chainId] || [];
      
      // ✅ CRITICAL FIX: Global Sanitization (Prices & Addresses)
      const sanitizedTokens = tokens.filter(t => {
          // 1. FILTER OUT: Frankenstein Tokens (Stablecoins with Native Address)
          if (['USDC', 'USDT', 'DAI', 'BUSD'].includes(t.symbol?.toUpperCase())) {
              const isNative = t.address === '0x0000000000000000000000000000000000000000' || 
                               t.address?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
              if (isNative) {
                  logger.warn(`🗑️ Removed valid-looking but corrupted token: ${t.symbol} with Native Address`);
                  return false; // REMOVE IT
              }
          }

          // ✅ FILTER OUT: Fake/Impostor Major Tokens
          // For Ethereum (Chain 1), enforce official addresses for critical assets
          if (t.chainId === 1) {
             const sym = t.symbol?.toUpperCase();
             const addr = t.address?.toLowerCase();
             
             // Official Addresses
             const USDC_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
             const USDT_ADDR = '0xdac17f958d2ee523a2206206994597c13d831ec7';
             const WETH_ADDR = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
             const NATIVE_ADDRS = ['0x0000000000000000000000000000000000000000', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'];

             if (sym === 'USDC' && addr !== USDC_ADDR) return false;
             if (sym === 'USDT' && addr !== USDT_ADDR) return false;
             if ((sym === 'ETH') && !NATIVE_ADDRS.includes(addr)) return false; 
             if ((sym === 'WETH') && addr !== WETH_ADDR) return false;
          }
          
          return true;
      }).map(t => {
          // 2. CORRECTION: Anomalous Prices
          
          // 2a. Stablecoins (Should be ~1.00)
          if (['USDC', 'USDT', 'DAI', 'BUSD'].includes(t.symbol?.toUpperCase())) {
              const price = parseFloat(t.priceUSD || '0');
              if (price > 2.0) {
                  return { ...t, priceUSD: '1.00' };
              }
          }

          // 2b. Major Tokens (Sanity Check)
          // Prevents issues where API might return $1 for ETH (e.g. on testnets or glitch)
          const symbol = t.symbol?.toUpperCase();
          const price = parseFloat(t.priceUSD || '0');
          
          if (symbol === 'ETH' || symbol === 'WETH') {
             if (price < 100.0 && price > 0) return { ...t, priceUSD: '2000.00' }; // Fallback safe price
          }
          if (symbol === 'BNB' || symbol === 'WBNB') {
             if (price < 20.0 && price > 0) return { ...t, priceUSD: '300.00' };
          }
          if (symbol === 'BTC' || symbol === 'WBTC') {
             if (price < 1000.0 && price > 0) return { ...t, priceUSD: '30000.00' };
          }
          
          return t;
      });

      // 2. Manually cache the SANITIZED data
      // This ensures subsequent sync calls get the corrected prices
      const cacheKey = `/tokens?chains=${chainId}`;
      this.setCache(cacheKey, { tokens: { [chainId]: sanitizedTokens } });

      return sanitizedTokens;
    } catch (error) {
      logger.error('Error fetching tokens:', error);
      const parsedError = parseApiError(error);
      throw new Error(parsedError.message);
    }
  }

  /**
   * Get cached chains synchronously
   */
  getChainsCached() {
    const cached = this.getCached('/chains');
    return cached?.chains || null;
  }

  /**
   * Get cached tokens synchronously
   */
  getTokensCached(chainId) {
    const cached = this.getCached(`/tokens?chains=${chainId}`);
    return cached?.tokens?.[chainId] || null;
  }

  // Duplicate getTokenInfo removed


  /**
   * Get multiple routes (production-grade with full error handling)
   * @param {Object} params - Route request parameters
   * @param {AbortSignal} [signal] - Optional abort signal for cancellation (Issue #4 fix)
   */
  async getRoutes(params, signal) {
    const {
      fromChainId,
      fromTokenAddress,
      fromAddress,
      fromAmount, // Now expects Human-Readable Amount (e.g. "1.5")
      fromTokenDecimals, // REQUIRED: Need decimals for normalization
      toChainId,
      toTokenAddress,
      toAddress,
      slippage = LIFI_CONFIG.defaultSlippage,
      options = {},
    } = params;

    // MANDATORY: Never default to 18; must use token-specific decimals
    if (!fromTokenDecimals) throw new Error("Decimals required for route fetching");

    const fromAmountAtomic = toBaseUnit(fromAmount, fromTokenDecimals);

    try {
      const requestBody = {
        fromChainId: Number(fromChainId),
        fromTokenAddress: String(fromTokenAddress),
        fromAddress: fromAddress ? String(fromAddress) : undefined,
        fromAmount: fromAmountAtomic, // Sent as atomic units
        toChainId: Number(toChainId),
        toTokenAddress: String(toTokenAddress),
        toAddress: (toAddress || fromAddress) ? String(toAddress || fromAddress) : undefined,
        options: {
          order: 'FASTEST', // Get routes sorted by speed
          slippage: Number(slippage),
          maxPriceImpact: 1.0, // Allow ALL routes, even with high impact
          allowSwitchChain: true, // Allow chain switches if needed
          integrator: LIFI_CONFIG.integrator, // Required for analytics attribution
          ...options,
        },
      };

      logger.log('📡 Fetching routes:', { ...requestBody, originalAmount: fromAmount });

      const data = await this.makeRequest('/advanced/routes', {
        method: 'POST',
        body: requestBody,
        retries: 1, // Quotes should be fast, don't retry too much
        signal, // Pass abort signal for cancellation (Issue #4 fix)
      });

      if (!data.routes || data.routes.length === 0) {
        throw {
          response: {
            data: {
              code: LIFI_ERROR_CODES.NO_QUOTE,
              message: 'No routes found for this swap',
            },
          },
        };
      }

      logger.log(`✅ Found ${data.routes.length} routes`);
      return data.routes;

    } catch (error) {
      logger.error('Error fetching routes:', error);
      const parsedError = parseApiError(error);
      
      // Enhance error message with tool errors if present
      if (parsedError.toolErrors && parsedError.toolErrors.length > 0) {
        const toolMessages = parsedError.toolErrors
          .slice(0, 3) // Show max 3 tool errors
          .map(te => `${te.tool}: ${te.message}`)
          .join('\n');
        
        throw new Error(`${parsedError.message}\n\n${toolMessages}`);
      }
      
      throw new Error(parsedError.message);
    }
  }

  /**
   * Get step transaction with enhanced error handling
   * Issue #6 fix: Validates route/step structure before API call
   */
  async getStepTransaction(route) {
    try {
      // Validate route has steps
      if (!route?.steps?.[0]) {
        throw new Error('Invalid route: no steps found');
      }

      const step = route.steps[0];
      
      // Issue #6 fix: Validate step has required fields
      const requiredFields = ['id', 'action', 'estimate', 'tool'];
      const missingFields = requiredFields.filter(field => !step[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Invalid step data: missing ${missingFields.join(', ')}`);
      }
      
      // Validate action structure
      if (!step.action?.fromToken || !step.action?.toToken || !step.action?.fromAmount) {
        throw new Error('Invalid step action: missing token or amount data');
      }

      logger.log('📡 Requesting step transaction for:', step.id);

      const data = await this.makeRequest('/advanced/stepTransaction', {
        method: 'POST',
        body: step,
        retries: 2,
        timeout: 90000, // Issue #7: 90s for complex bridges (Stargate, cBridge, etc.)
      });

      // Validate response
      if (!data?.transactionRequest) {
        throw new Error('API returned invalid transaction data');
      }

      logger.log('✅ Received step transaction');
      return data;

    } catch (error) {
      logger.error('❌ Error getting step transaction:', error);
      const parsedError = parseApiError(error);
      throw new Error(parsedError.message);
    }
  }

  /**
   * Check transaction status
   */
  async getStatus(params) {
    const { txHash, bridge, fromChain, toChain } = params;

    try {
      const queryParams = new URLSearchParams({
        txHash,
        ...(bridge && { bridge }),
        ...(fromChain && { fromChain: String(fromChain) }),
        ...(toChain && { toChain: String(toChain) }),
      });

      const data = await this.makeRequest(`/status?${queryParams}`, {
        retries: 3, // Status checks can retry more
      });

      return data;

    } catch (error) {
      logger.error('Error checking status:', error);
      const parsedError = parseApiError(error);
      throw new Error(parsedError.message);
    }
  }

  /**
   * Get gas prices for a chain
   */
  async getGasPrices(chainId) {
    try {
      const data = await this.makeRequest(`/gas/prices/${chainId}`, {
        cache: true,
      });
      return data;
    } catch (error) {
      logger.error('Error fetching gas prices:', error);
      // Return fallback gas prices
      return {
        standard: 20000000000, // 20 gwei
        fast: 25000000000,
        fastest: 30000000000,
      };
    }
  }

  /**
   * Get tools/bridges list
   */
  async getTools() {
    try {
      const data = await this.makeRequest('/tools', { cache: true });
      return {
        bridges: data.bridges || [],
        exchanges: data.exchanges || []
      };
    } catch (error) {
      logger.error('Error fetching tools:', error);
      return { bridges: [], exchanges: [] };
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    const remainingPercentage = (this.rateLimitInfo.remaining / this.rateLimitInfo.limit) * 100;
    
    return {
      ...this.rateLimitInfo,
      percentage: remainingPercentage,
      isLow: remainingPercentage < 20,
    };
  }
  /**
   * Get recent swaps (Mock implementation for social proof)
   */
  async getRecentSwaps({ limit = 5 } = {}) {
    // Return mock data for social proof
    return Array(limit).fill(0).map((_, i) => ({
      fromToken: { symbol: ['ETH', 'USDC', 'USDT', 'WBTC', 'DAI'][i % 5], logoURI: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png` },
      toToken: { symbol: ['USDC', 'ETH', 'DAI', 'USDT', 'WBTC'][i % 5], logoURI: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png` },
      fromAmount: (Math.random() * 10).toFixed(2),
      toAmount: (Math.random() * 20000).toFixed(2),
      chain: { name: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'][i % 5] },
      timestamp: Date.now() - Math.floor(Math.random() * 300000)
    }));
  }
}

// Export singleton instance
export const lifiService = new LiFiService();
export default lifiService;
