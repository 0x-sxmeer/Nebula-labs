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
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
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
    const { chain, method, params } = req.body;
    
    // Get RPC URL for chain
    const rpcUrls = {
      ethereum: process.env.ALCHEMY_ETH_RPC || 'https://rpc.flashbots.net',
      polygon: process.env.ALCHEMY_POLYGON_RPC || 'https://polygon-rpc.com',
      bsc: 'https://bsc-dataseed.binance.org',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      optimism: 'https://mainnet.optimism.io',
      base: 'https://mainnet.base.org',
      avalanche: 'https://api.avax.network/ext/bc/C/rpc'
    };
    
    const rpcUrl = rpcUrls[chain];
    if (!rpcUrl) {
      return res.status(400).json({ error: 'Unsupported chain' });
    }
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      })
    });
    
    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ RPC proxy error:', error);
    res.status(500).json({ 
      error: 'RPC request failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
