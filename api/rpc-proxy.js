// api/rpc-proxy.js - Enhanced RPC proxy with rate limiting

// Enhanced rate limiter using Vercel KV (Redis)
import { kv } from '@vercel/kv';

async function checkRateLimit(ip, limit = 200, windowMs = 900) {
  const key = `ratelimit:${ip}`;
  
  try {
    const count = await kv.incr(key);
    
    if (count === 1) {
      await kv.expire(key, windowMs);
    }
    
    const ttl = await kv.ttl(key);
    
    if (count > limit) {
      return { allowed: false, remaining: 0 };
    }
    
    return { allowed: true, remaining: limit - count };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true, remaining: limit };
  }
}

export default async function handler(req, res) {
  // Dynamic CORS: Allow requests from the configured origin OR any Vercel preview URL
  // Dynamic CORS: Lock down to configured origin
  const allowedOrigin = process.env.ALLOWED_ORIGINS;
  const requestOrigin = req.headers.origin || '';
  
  let originToAllow = '';
  
  if (!allowedOrigin) {
      if (process.env.NODE_ENV === 'development' || requestOrigin.endsWith('.vercel.app')) {
          originToAllow = requestOrigin;
      }
  } else {
      const allowedList = allowedOrigin.split(',').map(o => o.trim());
      if (allowedList.includes(requestOrigin)) {
          originToAllow = requestOrigin;
      }
  }

  res.setHeader('Access-Control-Allow-Origin', originToAllow);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const rateLimit = await checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Method Whitelist (Security)
  // Only allow read-only methods to prevent abuse
  const ALLOWED_METHODS = [
      'eth_call',
      'eth_estimateGas',
      'eth_getBalance',
      'eth_blockNumber',
      'eth_gasPrice',
      'eth_maxPriorityFeePerGas',
      'eth_feeHistory',
      'eth_chainId',
      'net_version',
      'eth_getTransactionCount',
      'eth_getCode'
  ];

  const requestMethod = req.body.method;
  if (!requestMethod || !ALLOWED_METHODS.includes(requestMethod)) {
      console.warn(`⚠️ Blocked prohibited RPC method: ${requestMethod}`);
      return res.status(403).json({ error: 'Method not allowed' });
  }
  
  try {
    // Support both body-based 'chain' (legacy) and query-param 'chain' (Wagmi standard)
    const chainParam = req.query.chain || req.body.chain;
    
    if (!chainParam) {
      return res.status(400).json({ error: 'Missing chain parameter' });
    }

    const start = Date.now();

    // Get RPC URL for chain
    const alchemyKey = process.env.ALCHEMY_API_KEY;
    const infuraKey = process.env.INFURA_API_KEY;
    
    // Define providers with failover priority
    const RPC_PROVIDERS = {
      ethereum: [
        alchemyKey ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}` : null,
        infuraKey ? `https://mainnet.infura.io/v3/${infuraKey}` : null,
        'https://rpc.ankr.com/eth',
        'https://eth.drpc.org',
        'https://1rpc.io/eth'
      ],
      polygon: [
        alchemyKey ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}` : null,
        infuraKey ? `https://polygon-mainnet.infura.io/v3/${infuraKey}` : null,
        'https://polygon-rpc.com',
        'https://polygon.drpc.org',
        'https://1rpc.io/matic'
      ],
      arbitrum: [
        alchemyKey ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}` : null,
        infuraKey ? `https://arbitrum-mainnet.infura.io/v3/${infuraKey}` : null,
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum.drpc.org',
        'https://1rpc.io/arb'
      ],
      optimism: [
        alchemyKey ? `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}` : null,
        infuraKey ? `https://optimism-mainnet.infura.io/v3/${infuraKey}` : null,
        'https://mainnet.optimism.io',
        'https://optimism.drpc.org',
        'https://1rpc.io/op'
      ],
      base: [
        alchemyKey ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}` : null,
        'https://mainnet.base.org',
        'https://base.drpc.org',
        'https://1rpc.io/base'
      ],
      bsc: [
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://bsc-dataseed1.ninicoin.io',
        'https://bsc.drpc.org',
        'https://1rpc.io/bnb'
      ],
      avalanche: [
        'https://api.avax.network/ext/bc/C/rpc',
        'https://rpc.ankr.com/avalanche',
        'https://avalanche.drpc.org',
        'https://1rpc.io/avax'
      ]
    };
    
    // Filter out nulls (missing keys)
    const providers = (RPC_PROVIDERS[chainParam] || []).filter(Boolean);
    
    if (providers.length === 0) {
      return res.status(400).json({ error: `Unsupported chain or no providers configured: ${chainParam}` });
    }
    
    // Construct Payload
    const payload = req.body.jsonrpc ? req.body : {
      jsonrpc: '2.0',
      id: 1,
      method: req.body.method,
      params: req.body.params
    };

    // FAILOVER LOGIC
    let lastError;
    let success = false;
    let data;

    for (const rpcUrl of providers) {
        try {
            const currentStart = Date.now();
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              // Short timeout for failover
              signal: AbortSignal.timeout(5000) 
            });
            
            if (!response.ok) {
               throw new Error(`Status ${response.status}`);
            }
        
            data = await response.json();
            
            // Success! Log if it wasn't the primary
            if (rpcUrl !== providers[0]) {
                console.log(`⚠️ Used fallback RPC for ${chainParam}: ${rpcUrl}`);
            }
            
            // Log slow requests
            const duration = Date.now() - start;
            if (duration > 1000) {
              console.log(`⚠️ Slow RPC [${chainParam}]: ${duration}ms`);
            }
            
            success = true;
            break; // Exit loop on success
            
        } catch (error) {
            console.warn(`RPC Failed [${chainParam}] (${rpcUrl}): ${error.message}`);
            lastError = error;
            // Continue to next provider
        }
    }
    
    if (!success) {
        throw new Error(`All providers failed. Last error: ${lastError?.message}`);
    }

    res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ RPC proxy error:', error);
    res.status(500).json({ 
      error: 'RPC request failed', 
      message: error.message 
    });
  }
}
