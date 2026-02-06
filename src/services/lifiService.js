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
    this.LS_KEY = 'lifi_cache_v1';
    
    // Load from LocalStorage
    this.loadFromLocalStorage();
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
           // ... (keep your existing error handling logic here) ...
           const errorData = await response.json().catch(() => ({}));
           throw { response: { status: response.status, data: errorData } };
        }

        const data = await response.json();

        if (method === 'GET' && cache) {
          this.setCache(endpoint, data);
        }

        return data;

      } catch (error) {
        lastError = error;
        // ... (keep your existing retry logic here) ...
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
      const data = await this.makeRequest(`/tokens?chains=${chainId}`, { cache: true });
      return data.tokens?.[chainId] || [];
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

  /**
   * Get token details with price
   */
  async getTokenInfo(chainId, tokenAddress) {
    try {
      const data = await this.makeRequest(`/token?chain=${chainId}&token=${tokenAddress}`, { cache: true });
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
      fromAmount,
      toChainId,
      toTokenAddress,
      toAddress,
      slippage = LIFI_CONFIG.defaultSlippage,
      options = {},
    } = params;

    try {
      const requestBody = {
        fromChainId: Number(fromChainId),
        fromTokenAddress: String(fromTokenAddress),
        fromAddress: fromAddress ? String(fromAddress) : undefined,
        fromAmount: String(fromAmount),
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

      logger.log('📡 Fetching routes:', requestBody);

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
}

// Export singleton instance
export const lifiService = new LiFiService();
export default lifiService;
