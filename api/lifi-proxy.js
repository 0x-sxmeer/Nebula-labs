// api/lifi-proxy.js - Enhanced with rate limiting and security

// Simple in-memory rate limiter (for Vercel serverless)
// Enhanced rate limiter using Vercel KV (Redis)
import { kv } from '@vercel/kv';

async function checkRateLimit(ip, limit = 100, windowMs = 900) {
  const key = `ratelimit:${ip}`;
  
  try {
    // Increment counter
    const count = await kv.incr(key);
    
    // Set expiry on first request
    if (count === 1) {
      await kv.expire(key, windowMs); // 15 minutes = 900 seconds
    }
    
    // Get TTL for resetIn
    const ttl = await kv.ttl(key);
    
    if (count > limit) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetIn: ttl 
      };
    }
    
    return { 
      allowed: true, 
      remaining: limit - count,
      resetIn: ttl
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis is down
    return { allowed: true, remaining: limit };
  }
}

export default async function handler(req, res) {
  // Dynamic CORS: Allow requests from the configured origin OR any Vercel preview URL
  // Dynamic CORS: Lock down to configured origin in production
  const allowedOrigin = process.env.ALLOWED_ORIGINS;
  const requestOrigin = req.headers.origin || '';
  
  let originToAllow = ''; // Default to blocking
  
  if (!allowedOrigin) {
      // Dev mode or misconfiguration: Allow Vercel previews
      if (process.env.NODE_ENV === 'development' || requestOrigin.endsWith('.vercel.app')) {
          originToAllow = requestOrigin;
      }
  } else {
      // Production: Strict check (Normalized)
      const allowedList = allowedOrigin.split(',').map(o => o.trim().replace(/\/$/, ''));
      const normalizedRequestOrigin = requestOrigin.replace(/\/$/, '');
      
      if (allowedList.includes(normalizedRequestOrigin)) {
          originToAllow = requestOrigin;
      }
  }
 

  res.setHeader('Access-Control-Allow-Origin', originToAllow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-lifi-api-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const rateLimit = await checkRateLimit(ip);
  
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
