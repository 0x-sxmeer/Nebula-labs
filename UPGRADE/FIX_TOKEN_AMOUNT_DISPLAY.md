# Fix for Token Amount Display Issue

## Problem Analysis

Based on the screenshots and code analysis, when selecting different chains and tokens in the swap interface, the amounts shown are incorrect - displaying ETH and USD values instead of the actual selected token amounts.

### Root Cause

The issue is in `/src/hooks/useSwap.js` at line 704-706:

```javascript
const outputAmount = route.toAmount || '0';
const outputFormatted = formatUnits(
  BigInt(outputAmount),
  toToken.decimals  // ❌ PROBLEM: Using state token decimals
);
```

**The Problem:**
- `toToken` is from the component's state
- When a user selects a new token/chain, the state `toToken` might temporarily have different decimals than the route's actual destination token
- This causes the amount to be formatted with wrong decimals, showing incorrect values

### The Solution

LiFi routes contain the complete token information. We need to extract the token decimals from the route itself, not from the state.

## Implementation

### Step 1: Update useSwap.js Route Processing

Replace the route processing section (lines 700-746) with the following:

```javascript
// Process routes
const routesWithMetadata = validRoutes.map((route, index) => {
  const outputAmount = route.toAmount || '0';
  
  // ✅ FIX: Get decimals from route's action, not state
  // The route contains the actual token information for the destination
  let destinationDecimals = toToken.decimals; // Default fallback
  
  // Check if route has action with destination token info
  if (route.action && route.action.toToken && route.action.toToken.decimals !== undefined) {
    destinationDecimals = route.action.toToken.decimals;
  }
  // Alternative: Check last step of multi-step routes
  else if (route.steps && route.steps.length > 0) {
    const lastStep = route.steps[route.steps.length - 1];
    if (lastStep.action && lastStep.action.toToken && lastStep.action.toToken.decimals !== undefined) {
      destinationDecimals = lastStep.action.toToken.decimals;
    }
  }
  
  const outputFormatted = formatUnits(
    BigInt(outputAmount),
    destinationDecimals  // ✅ Use route's destination decimals
  );
  
  // Calculate Gas Cost USD (Deep Aggregation)
  let gasCostUSD = 0;
  if (route.gasCosts && route.gasCosts.length > 0) {
       gasCostUSD = route.gasCosts.reduce((acc, cost) => acc + parseFloat(cost.amountUSD || 0), 0);
  } else {
       // Fallback: Aggregate from steps
       gasCostUSD = (route.steps || []).reduce((acc, step) => {
           const stepGas = (step.estimate?.gasCosts || []).reduce((gAcc, gCost) => gAcc + parseFloat(gCost.amountUSD || 0), 0);
           return acc + stepGas;
       }, 0);
  }
  
  // Calculate Provider Fees (Deep Aggregation for Tooltip)
  let allFees = route.fees || [];
  if (allFees.length === 0 && route.steps) {
       route.steps.forEach(step => {
           if (step.estimate?.feeCosts) {
               allFees = [...allFees, ...step.estimate.feeCosts];
           }
       });
  }

  const outputUSD = parseFloat(route.toAmountUSD || '0');
  const netValue = Math.max(0, outputUSD - gasCostUSD).toFixed(2);

  return {
    ...route,
    isBest: index === 0,
    outputAmountFormatted: parseFloat(outputFormatted).toFixed(6),
    inputUSD: route.fromAmountUSD || '0',
    outputUSD: route.toAmountUSD || '0',
    priceImpact: route.priceImpact || 0,
    gasUSD: gasCostUSD.toFixed(2),
    netValue: netValue,
    fees: allFees,
    timestamp: Date.now(),
    // ✅ Store the actual destination token info from route
    routeDestinationToken: route.action?.toToken || (route.steps && route.steps.length > 0 ? route.steps[route.steps.length - 1].action?.toToken : null)
  };
});
```

### Step 2: Also Fix Input Amount Formatting (If Needed)

For consistency, check if the same issue exists for `fromAmount`. If the route has `fromToken` information in its action, use that:

```javascript
// ✅ Get source token decimals from route
let sourceDecimals = fromToken.decimals; // Default fallback

if (route.action && route.action.fromToken && route.action.fromToken.decimals !== undefined) {
  sourceDecimals = route.action.fromToken.decimals;
} else if (route.steps && route.steps.length > 0) {
  const firstStep = route.steps[0];
  if (firstStep.action && firstStep.action.fromToken && firstStep.action.fromToken.decimals !== undefined) {
    sourceDecimals = firstStep.action.fromToken.decimals;
  }
}
```

### Step 3: Verify USD Value Calculations

The `useOutputUSDValue` hook already correctly prioritizes route data over state:

```javascript
// Priority 1: route.toAmountUSD ✅
// Priority 2: route.toToken.priceUSD ✅
// Priority 3: toToken.priceUSD (fallback)
```

This is correct and doesn't need changes.

## Testing

After applying the fix, test the following scenarios:

1. **Same Chain Swap** (e.g., ETH → USDC on Ethereum)
   - Select 1 ETH as input
   - Verify output shows correct USDC amount (should be ~$2000 worth of USDC)

2. **Cross-Chain Swap** (e.g., BNB on BSC → USDC on Ethereum)
   - Select 1 BNB as input
   - Verify output shows correct USDC amount on Ethereum

3. **Token with Different Decimals** (e.g., USDC [6 decimals] → DAI [18 decimals])
   - Verify amounts are correctly formatted
   - Check both input and output values

4. **Rapid Chain/Token Switching**
   - Quickly switch between different chains and tokens
   - Verify amounts update correctly without showing wrong values

## Additional Recommendations

### 1. Add Logging for Debugging

Add console logging to track decimal usage:

```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('[Route Processing]', {
    outputAmount,
    decimalsUsed: destinationDecimals,
    decimalsSource: route.action?.toToken ? 'route.action' : 'state',
    outputFormatted,
    toToken: toToken.symbol,
    routeToToken: route.action?.toToken?.symbol
  });
}
```

### 2. Add Validation

Add validation to ensure decimals are always valid:

```javascript
// Validate decimals before formatting
if (typeof destinationDecimals !== 'number' || destinationDecimals < 0 || destinationDecimals > 18) {
  console.error('[Route Processing] Invalid decimals:', destinationDecimals, 'using fallback');
  destinationDecimals = 18; // Safe fallback
}
```

### 3. Type Safety (Optional - If Using TypeScript)

If converting to TypeScript, add proper types:

```typescript
interface RouteToken {
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
  name: string;
  priceUSD?: string;
  logoURI?: string;
}

interface RouteAction {
  fromToken: RouteToken;
  toToken: RouteToken;
  fromAmount: string;
  toAmount: string;
}
```

## Files to Modify

1. `/src/hooks/useSwap.js` - Line 700-746 (route processing)

## Alternative Quick Fix (If Above Doesn't Work)

If the route structure is different than expected, you can use this fallback approach:

```javascript
const outputFormatted = formatUnits(
  BigInt(outputAmount),
  route.toTokenDecimals || toToken.decimals || 18 // Try multiple sources
);
```

But this is not recommended as it doesn't address the root cause.

## Summary

The fix ensures that token amounts are always formatted using the correct decimals from the route data, not from the potentially stale state. This prevents the issue where changing chains/tokens shows incorrect amounts like "ETH" and "USD" values instead of the actual selected token amounts.
