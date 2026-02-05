# 🚀 DEPLOYMENT GUIDE - VERCEL PRODUCTION

## Prerequisites Checklist

Before deploying, ensure you have:

- [ ] Vercel account set up
- [ ] GitHub repository with your code
- [ ] WalletConnect Project ID
- [ ] LiFi API Key
- [ ] Alchemy API Key (recommended)
- [ ] Sentry DSN (recommended)
- [ ] Domain name (optional but recommended)

---

## Step 1: Prepare Environment Variables

### On Vercel Dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

#### Required Variables:

```bash
# WalletConnect (Frontend - Production & Preview)
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# LiFi API Key (Backend only - Production & Preview)  
LIFI_API_KEY=your_lifi_api_key

# CORS Settings (Production only)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Recommended Variables:

```bash
# Error Tracking (All environments)
VITE_SENTRY_DSN=your_sentry_dsn

# RPC Provider (Backend - Production & Preview)
ALCHEMY_API_KEY=your_alchemy_api_key

# Analytics (Production only)
VITE_MIXPANEL_TOKEN=your_mixpanel_token
```

#### Feature Flags:

```bash
# All environments
VITE_ENABLE_MEV_PROTECTION=false
VITE_ENABLE_SWAP_HISTORY=true
```

### Important Notes:

- Variables starting with `VITE_` are exposed to frontend (safe for public info only)
- Variables without `VITE_` are server-side only (for sensitive API keys)
- Set different scopes: Production, Preview, Development
- **NEVER** put sensitive keys in variables starting with `VITE_`

---

## Step 2: Configure vercel.json

Ensure your `vercel.json` is properly configured:

```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org https://api.web3modal.org https://cca-lite.coinbase.com https://*.alchemy.com https://*.infura.io https://rpc.flashbots.net; frame-ancestors 'none';"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ],
  "rewrites": [
    { "source": "/api/lifi-proxy", "destination": "/api/lifi-proxy.js" },
    { "source": "/api/rpc-proxy", "destination": "/api/rpc-proxy.js" }
  ]
}
```

---

## Step 3: Pre-Deployment Testing

### Local Testing:

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with production values
cp .env.production.example .env

# 3. Test build locally
npm run build
npm run preview

# 4. Test all features:
# - Wallet connection
# - Token selection
# - Quote fetching
# - Swap execution
# - Error handling
```

### Testnet Testing (Recommended):

Before deploying to mainnet:

1. Deploy to Vercel preview environment
2. Test with testnet networks (Goerli, Sepolia)
3. Verify API proxy works correctly
4. Check error logging in Sentry
5. Monitor gas estimates
6. Test edge cases (insufficient balance, network errors)

---

## Step 4: Deploy to Vercel

### Option 1: GitHub Integration (Recommended)

1. **Connect Repository:**
   ```bash
   # Push code to GitHub
   git add .
   git commit -m "Production ready deployment"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to vercel.com/new
   - Import your GitHub repository
   - Select the correct branch (main/master)

3. **Configure Build Settings:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables:**
   - Add all variables from Step 1
   - Set correct scopes (Production/Preview/Development)

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Check deployment logs for errors

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## Step 5: Post-Deployment Verification

### Immediate Checks (First 15 Minutes):

- [ ] Website loads without errors
- [ ] All assets load correctly
- [ ] Wallet connection works
- [ ] Token list loads
- [ ] API proxy works (check Network tab)
- [ ] No console errors
- [ ] Sentry receives errors correctly

### Functional Testing (First Hour):

- [ ] Complete a test swap (small amount)
- [ ] Verify transaction succeeds
- [ ] Check swap history saves correctly
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Test different wallet providers

### Performance Checks:

```bash
# Run Lighthouse audit
npx lighthouse https://yourdomain.com --view

# Target scores:
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 80
```

### Monitoring Setup:

1. **Sentry Dashboard:**
   - Check error rates
   - Set up alerts for error spikes
   - Configure weekly reports

2. **Vercel Analytics:**
   - Monitor page views
   - Check Core Web Vitals
   - Track conversion funnels

3. **API Monitoring:**
   - Set up uptime monitoring (UptimeRobot, Pingdom)
   - Monitor API response times
   - Track rate limit usage

---

## Step 6: Custom Domain Setup (Optional)

1. **Add Domain in Vercel:**
   - Go to Project Settings > Domains
   - Add your domain
   - Follow DNS configuration instructions

2. **Configure DNS:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Wait for Propagation:**
   - Usually takes 15 minutes to 48 hours
   - Use https://dnschecker.org to verify

4. **Enable HTTPS:**
   - Automatic with Vercel
   - Certificate issued within minutes

---

## Step 7: Ongoing Maintenance

### Daily:
- [ ] Check Sentry for new errors
- [ ] Monitor swap success rate
- [ ] Check API rate limit usage

### Weekly:
- [ ] Review analytics
- [ ] Update dependencies (npm update)
- [ ] Check for security advisories
- [ ] Test new wallet releases

### Monthly:
- [ ] Full functional testing
- [ ] Performance audit
- [ ] Security review
- [ ] Backup important data
- [ ] Review error logs

---

## Troubleshooting Guide

### Issue: "Failed to fetch routes"

**Possible Causes:**
1. LIFI_API_KEY not set correctly
2. CORS issues
3. Rate limit exceeded

**Solutions:**
```bash
# Check Vercel logs
vercel logs

# Verify environment variables
vercel env ls

# Test API directly
curl https://yourdomain.com/api/lifi-proxy

# Check CORS headers
curl -H "Origin: https://yourdomain.com" -I https://yourdomain.com/api/lifi-proxy
```

### Issue: "Wallet won't connect"

**Possible Causes:**
1. VITE_WALLETCONNECT_PROJECT_ID not set
2. CSP headers too restrictive
3. Wrong network selected

**Solutions:**
- Check browser console for errors
- Verify WalletConnect ID in environment variables
- Test with different wallets
- Check CSP headers allow WalletConnect domains

### Issue: "Transaction fails immediately"

**Possible Causes:**
1. Insufficient gas
2. Token not approved
3. Slippage too low
4. Invalid route

**Solutions:**
- Check Sentry logs for specific error
- Verify gas estimates
- Test with higher slippage
- Try smaller amount

### Issue: "High error rate in Sentry"

**Action Plan:**
1. Identify most common error
2. Check if it's affecting users
3. Deploy hotfix if critical
4. Add better error handling
5. Update documentation

---

## Rollback Procedure

If deployment has critical issues:

### Via Vercel Dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." menu
4. Select "Promote to Production"

### Via CLI:
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel alias set [deployment-url] yourdomain.com
```

### Emergency Maintenance Mode:

Create a simple maintenance page:

```javascript
// api/maintenance.js
export default function handler(req, res) {
  res.status(503).send(`
    <html>
      <body style="text-align: center; padding: 50px; font-family: sans-serif;">
        <h1>🔧 Under Maintenance</h1>
        <p>We're making improvements. Check back soon!</p>
      </body>
    </html>
  `);
}
```

---

## Performance Optimization Checklist

After deployment, consider these optimizations:

### Code Splitting:
```javascript
// Lazy load heavy components
const SwapPage = lazy(() => import('./pages/SwapPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
```

### Image Optimization:
- Use WebP format
- Compress images (TinyPNG)
- Lazy load below-fold images
- Use Vercel's image optimization

### Bundle Size:
```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer

# Look for:
# - Duplicate dependencies
# - Unused libraries
# - Large dependencies (consider alternatives)
```

### Caching Strategy:
```javascript
// In vercel.json
"headers": [
  {
    "source": "/assets/(.*)",
    "headers": [
      {
        "key": "Cache-Control",
        "value": "public, max-age=31536000, immutable"
      }
    ]
  }
]
```

---

## Security Hardening

### Post-Deployment:

1. **Enable Bot Protection:**
   - Use Vercel's bot protection
   - Add rate limiting at edge

2. **Monitor for Attacks:**
   - Watch for unusual traffic patterns
   - Set up DDoS alerts
   - Monitor API abuse

3. **Regular Updates:**
   - Keep dependencies updated
   - Subscribe to security advisories
   - Rotate API keys periodically

4. **Audit Logging:**
   - Log all transactions
   - Monitor for suspicious patterns
   - Set up alerts for large swaps

---

## Success Metrics

Track these KPIs:

### Technical:
- Uptime: > 99.9%
- Error rate: < 1%
- Average response time: < 2s
- Successful swaps: > 95%

### User Experience:
- Time to first swap: < 30s
- Bounce rate: < 40%
- Return users: Track weekly
- Mobile vs Desktop: Track split

### Business:
- Daily active users
- Total volume swapped
- Number of supported chains used
- User retention rate

---

## Support & Documentation

### For Users:
- Create FAQ page
- Add troubleshooting guide
- Provide email support
- Set up Discord/Telegram

### For Developers:
- Document API endpoints
- Provide integration examples
- Keep changelog updated
- Offer technical support channel

---

## Emergency Contacts

Keep this information handy:

```
Vercel Support: support@vercel.com
LiFi Support: [support channel]
Alchemy Support: [support email]
WalletConnect: [support channel]
Sentry: [support email]

Your Team:
Lead Developer: [contact]
DevOps: [contact]
Security: [contact]
```

---

## Congratulations! 🎉

Your swap aggregator is now live. Remember:

- Monitor closely for the first 48 hours
- Be ready to roll back if needed
- Keep your team informed
- Celebrate the launch! 🚀

**Next Steps:**
1. Monitor error rates
2. Gather user feedback
3. Plan iterative improvements
4. Scale infrastructure as needed

Good luck with your production deployment!
