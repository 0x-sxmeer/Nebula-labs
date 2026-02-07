# Token Amount Display Fix - Implementation Guide

## Summary

Fixed the critical bug where selecting different chains and tokens showed incorrect amounts (displaying ETH and USD values instead of actual token amounts).

## Root Cause

In `/src/hooks/useSwap.js` (line ~706), the code was using `toToken.decimals` from the React state to format output amounts. When users changed chains/tokens, there was a timing mismatch where:

1. User selects new token (e.g., BNB with 18 decimals)
2. Route is fetched from LiFi API (returns USDC with 6 decimals as destination)
3. State still has old token's decimals or new token's decimals
4. Output amount gets formatted with wrong decimals → Shows completely wrong values

## The Fix

Changed line ~704-707 in `/src/hooks/useSwap.js` to extract decimals from the route's actual token data:

### Before (Buggy):
```javascript
const outputAmount = route.toAmount || '0';
const outputFormatted = formatUnits(
  BigInt(outputAmount),
  toToken.decimals  // ❌ From state - can be wrong
);
```

### After (Fixed):
```javascript
const outputAmount = route.toAmount || '0';

// ✅ FIX: Get decimals from route's actual destination token
let destinationDecimals = toToken.decimals; // Fallback

// Priority 1: Single-step swaps
if (route.action && route.action.toToken && typeof route.action.toToken.decimals === 'number') {
  destinationDecimals = route.action.toToken.decimals;
}
// Priority 2: Multi-step routes (bridges)
else if (route.steps && route.steps.length > 0) {
  const lastStep = route.steps[route.steps.length - 1];
  if (lastStep.action && lastStep.action.toToken && typeof lastStep.action.toToken.decimals === 'number') {
    destinationDecimals = lastStep.action.toToken.decimals;
  }
}

// Validate decimals
if (typeof destinationDecimals !== 'number' || destinationDecimals < 0 || destinationDecimals > 18) {
  console.warn('[Route Processing] Invalid decimals:', destinationDecimals);
  destinationDecimals = 18; // Safe fallback
}

const outputFormatted = formatUnits(
  BigInt(outputAmount),
  destinationDecimals  // ✅ From route - always correct
);
```

## Files Modified

1. **`/src/hooks/useSwap.js`** - Fixed route processing (lines ~701-735)

## Testing Checklist

### Test Case 1: Same-Chain Swap
- [ ] Select Ethereum as both chains
- [ ] Select ETH → USDC
- [ ] Enter 1 ETH
- [ ] **Expected:** Should show ~2000 USDC (based on current price)
- [ ] **Bug would show:** Wrong amount or weird decimals

### Test Case 2: Cross-Chain Swap
- [ ] Select BSC as source chain
- [ ] Select Ethereum as destination chain
- [ ] Select BNB → USDC
- [ ] Enter 1 BNB
- [ ] **Expected:** Should show correct USDC amount on Ethereum
- [ ] **Bug would show:** Wrong token amount or "ETH" instead of "USDC"

### Test Case 3: Different Decimals
- [ ] Select Ethereum
- [ ] Select USDC (6 decimals) → DAI (18 decimals)
- [ ] Enter 100 USDC
- [ ] **Expected:** Should show ~100 DAI with proper decimals
- [ ] **Bug would show:** Massively wrong amount (e.g., 0.0001 DAI or 100000000000 DAI)

### Test Case 4: Rapid Switching
- [ ] Rapidly switch between different chains and tokens
- [ ] **Expected:** Amounts should update correctly each time
- [ ] **Bug would show:** Flickering wrong amounts, cached old values

### Test Case 5: Token Images in Screenshots
Based on your screenshots:
- [ ] Image 1: BNB → USDC (showing "1" BNB should give ~2005 USDC)
- [ ] Image 2: ETH → USDC (showing "1" ETH should give ~2004 USDC)
- [ ] **Verify both scenarios work correctly now**

## Deployment Steps

### Local Testing

1. **Backup current code:**
   ```bash
   cd /path/to/blackbox_dapp
   git checkout -b bugfix/token-amount-display
   ```

2. **Apply the fix:**
   ```bash
   # Replace the useSwap.js file with the fixed version
   cp useSwap.js src/hooks/useSwap.js
   ```

3. **Install dependencies (if not already):**
   ```bash
   npm install
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Test all scenarios** from the checklist above

6. **Check browser console** for any errors or warnings

### Production Deployment

1. **Commit changes:**
   ```bash
   git add src/hooks/useSwap.js
   git commit -m "fix: correct token amount display using route decimals

   - Fixed issue where amounts showed ETH/USD instead of selected tokens
   - Now extracts decimals from route's actual token data
   - Prevents mismatch when changing chains/tokens
   - Added validation for decimal values
   
   Fixes: Token amount display bug when switching chains/tokens"
   ```

2. **Push to repository:**
   ```bash
   git push origin bugfix/token-amount-display
   ```

3. **Create Pull Request** (if using GitHub/GitLab)

4. **After approval, merge to main:**
   ```bash
   git checkout main
   git merge bugfix/token-amount-display
   ```

5. **Deploy to Vercel/Production:**
   ```bash
   # If using Vercel CLI
   vercel --prod
   
   # Or push to main to trigger auto-deployment
   git push origin main
   ```

## Verification

After deployment, verify:

1. **No console errors** when switching tokens
2. **Amounts update correctly** for all token pairs
3. **USD values match** the token amounts
4. **Cross-chain swaps** show correct destination amounts
5. **No flickering** or temporary wrong values

## Debugging

If issues persist:

1. **Check browser console** for:
   ```
   [Route Processing] Invalid decimals: ...
   ```
   This means the route structure might be different

2. **Add temporary logging:**
   ```javascript
   console.log('Route structure:', {
     hasAction: !!route.action,
     hasActionToToken: !!route.action?.toToken,
     decimalsFromAction: route.action?.toToken?.decimals,
     decimalsFromState: toToken.decimals,
     outputAmount,
     outputFormatted
   });
   ```

3. **Verify LiFi API response:**
   - Open Network tab in DevTools
   - Look for calls to `/api/lifi-proxy`
   - Check response structure matches expected format

## Additional Notes

- The fix is backward compatible - uses fallback to state decimals if route data unavailable
- Includes validation to prevent crashes from invalid decimal values
- Works for both simple swaps and complex multi-step routes
- No changes needed to other components (SwapCard.jsx, useOutputUSDValue.jsx are already correct)

## Rollback Plan

If you need to rollback:

```bash
# Revert the commit
git revert HEAD

# Or checkout previous version
git checkout <previous-commit-hash> src/hooks/useSwap.js
```

Then redeploy.

## Support

If you encounter any issues:

1. Check the console for error messages
2. Verify the route structure matches expectations
3. Test with different token pairs
4. Share console logs and network requests for debugging

## Success Criteria

✅ Fix is successful when:
- All token amounts display correctly
- No "ETH" or "USD" shown instead of selected tokens
- Amounts update properly when switching chains/tokens
- No console errors or warnings
- Both same-chain and cross-chain swaps work correctly
