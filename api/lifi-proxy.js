// api/lifi-proxy.js - Enhanced with rate limiting and security

// Simple in-memory rate limiter (for Vercel serverless)
const requests = new Map();

function checkRateLimit(ip, limit = 100, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const userRequests = requests.get(ip) || [];
  
  // Clean old requests
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= limit) {
    return { allowed: false, remaining: 0, resetIn: windowMs - (now - recentRequests[0]) };
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
  
  // If request comes from a vercel.app preview and we have a strict policy, allow it for previews
  if (allowedOrigin !== '*' && requestOrigin.endsWith('.vercel.app')) {
      originToAllow = requestOrigin;
  } else if (allowedOrigin !== '*' && requestOrigin === allowedOrigin) {
      originToAllow = allowedOrigin;
  }
  
  // If we want to be permissive during debugging:
  // originToAllow = requestOrigin || '*'; 

  res.setHeader('Access-Control-Allow-Origin', originToAllow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-lifi-api-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const rateLimit = checkRateLimit(ip);
  
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      message: `Please wait ${Math.ceil(rateLimit.resetIn / 1000)}s before retrying`
    });
  }
  
  // Health check for debugging
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      origin: requestOrigin,
      allowed: originToAllow
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { endpoint, body, method: clientMethod } = req.body;
    
    // Validate endpoint whitelist
    const allowedEndpoints = [
      '/chains',
      '/tokens',
      '/advanced/routes',
      '/advanced/stepTransaction',
      '/status',
      '/tools',
      '/gas/prices',
      '/token'
    ];
    
    const isAllowed = allowedEndpoints.some(e => endpoint.startsWith(e));
    
    if (!isAllowed) {
      return res.status(400).json({ error: 'Invalid endpoint' });
    }
    
    // Validate API key exists
    if (!process.env.LIFI_API_KEY) {
      console.error('❌ LIFI_API_KEY not configured');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }
    
    // Determine method
    const method = clientMethod || (
      (endpoint.includes('/advanced') || endpoint.includes('/stepTransaction')) 
        ? 'POST' 
        : 'GET'
    );
    
    // Make request to Li.Fi
    const response = await fetch(`https://li.quest/v1${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-lifi-api-key': process.env.LIFI_API_KEY // ✅ Server-side only
      },
      ...((method === 'POST' && body) && { body: JSON.stringify(body) })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Li.Fi API Error [${response.status}]:`, JSON.stringify(errorData));
      return res.status(response.status).json(errorData);
    }
    
    const data = await response.json();
    
    // Log for monitoring
    console.log(`✅ Li.Fi API: ${method} ${endpoint} - ${response.status}`);
    
    res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Li.Fi proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
