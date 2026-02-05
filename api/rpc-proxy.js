// api/rpc-proxy.js - Enhanced RPC proxy with rate limiting

const requests = new Map();

function checkRateLimit(ip, limit = 200, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const userRequests = requests.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  recentRequests.push(now);
  requests.set(ip, recentRequests);
  
  return { allowed: true, remaining: limit - recentRequests.length };
}

export default async function handler(req, res) {
  // Dynamic CORS: Allow requests from the configured origin OR any Vercel preview URL
  const allowedOrigin = process.env.ALLOWED_ORIGINS || '*';
  const requestOrigin = req.headers.origin || '';
  
  let originToAllow = allowedOrigin;
  
  if (allowedOrigin !== '*' && requestOrigin.endsWith('.vercel.app')) {
      originToAllow = requestOrigin;
  } else if (allowedOrigin !== '*' && requestOrigin === allowedOrigin) {
      originToAllow = allowedOrigin;
  }

  res.setHeader('Access-Control-Allow-Origin', originToAllow);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const rateLimit = checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    
    const rpcUrls = {
      ethereum: alchemyKey ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://rpc.flashbots.net',
      polygon: alchemyKey ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://polygon-rpc.com',
      arbitrum: alchemyKey ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://arb1.arbitrum.io/rpc',
      optimism: alchemyKey ? `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://mainnet.optimism.io',
      base: alchemyKey ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}` : 'https://mainnet.base.org',
      bsc: 'https://bsc-dataseed.binance.org',
      avalanche: 'https://api.avax.network/ext/bc/C/rpc'
    };
    
    // Map standard chain IDs to keys if needed, but our config sends names usually.
    // Wagmi config will send ?chain=ethereum
    
    const rpcUrl = rpcUrls[chainParam];
    if (!rpcUrl) {
      return res.status(400).json({ error: `Unsupported chain: ${chainParam}` });
    }
    
    // Construct Payload: Support both my custom format and standard JSON-RPC
    const payload = req.body.jsonrpc ? req.body : {
      jsonrpc: '2.0',
      id: 1,
      method: req.body.method,
      params: req.body.params
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
       console.error(`❌ RPC Error [${chainParam}]: ${response.status} ${response.statusText}`);
       return res.status(response.status).json({ error: 'Provider Error', details: await response.text() });
    }

    const data = await response.json();
    
    // Log slow requests (>1s)
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`⚠️ Slow RPC [${chainParam}]: ${duration}ms`);
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
