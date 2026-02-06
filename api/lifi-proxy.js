// api/lifi-proxy.js
export default async function handler(req, res) {
  // 1. CORS Configuration
  const allowedOrigins = [
    'https://nebula-labs-ten.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  
  // Set CORS headers dynamically based on origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Optional: Allow all if you want public access, otherwise block
    res.setHeader('Access-Control-Allow-Origin', '*'); 
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-lifi-api-key');

  // 2. Handle Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Validate Configuration
  if (!process.env.LIFI_API_KEY) {
    console.error('SERVER ERROR: LIFI_API_KEY is missing in Vercel Environment Variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 4. Parse "Wrapped" Request
    // The frontend sends: { endpoint: '/advanced/routes', method: 'POST', body: {...} }
    const { endpoint, method = 'GET', body } = req.body || {};

    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }

    // 5. Construct Real Li.Fi URL
    // Ensure we don't have double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetUrl = `https://li.fi/v1${cleanEndpoint}`;

    console.log(`Proxying ${method} request to: ${targetUrl}`);

    // 6. Make the Request to Li.Fi (Server-to-Server)
    const response = await fetch(targetUrl, {
      method: method,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-lifi-api-key': process.env.LIFI_API_KEY // 🔒 Key injected here, hidden from client
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    });

    // 7. Handle Response
    const data = await response.json();

    if (!response.ok) {
      console.error('Li.Fi API Error:', data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ 
      error: 'Proxy connection failed', 
      details: error.message 
    });
  }
}
