
import { useSendTransaction, useEstimateFeesPerGas, useSwitchChain, useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { lifiService } from '../services/lifiService';
import { logger } from '../utils/logger';
import { NATIVE_TOKEN_ADDRESS } from '../config/lifi.config';
import { APPROVED_LIFI_ROUTERS, GAS_LIMITS } from '../config/security';
import { analytics } from '../services/analyticsService';

/**
 * ✅ FIXED: Comprehensive transaction validation before sending
 * Merged with robust logic from utils/swapExecution.js
 */
export const useSwapExecution = () => {
  const { sendTransactionAsync } = useSendTransaction();
  const { data: feeData } = useEstimateFeesPerGas();
  const { switchChainAsync } = useSwitchChain();
  const { chain } = useAccount();
  
  /**
   * Check if router address is approved (whitelisted)
   */
  const isApprovedRouter = (address, chainId) => {
    const approvedRouters = APPROVED_LIFI_ROUTERS[chainId];
    
    if (!approvedRouters || approvedRouters.length === 0) {
      logger.warn(`⚠️ No router whitelist defined for chain ${chainId}`);
      return { approved: true, unknown: true };
    }
    
    const isApproved = approvedRouters
      .map(r => r.toLowerCase())
      .includes(address.toLowerCase());
    
    return { approved: isApproved, unknown: false };
  };

  /**
   * Validates everything before executing swap
   */
  const executeSwap = async ({
    selectedRoute,
    fromToken,
    toToken,
    fromAmount,
    hasSufficientBalance,
    checkBalance,
    // useMevProtection, // Removed as service is deprecated
  }) => {
    // 0. ✅ Sanction Screening (Placeholder)
    // TODO: Integrate TRM Labs or Chainalysis API here
    // const isSanctioned = await checkSanctions(walletAddress);
    // if (isSanctioned) throw new Error('Compliance Check Failed: Address is blocked');
    
    // 1. Basic validation
    if (!selectedRoute) {
      throw new Error('No route selected');
    }
    
    if (!fromToken || !toToken) {
      throw new Error('Invalid tokens');
    }

    if (!hasSufficientBalance) {
      throw new Error('Insufficient balance');
    }

    // 1b. ✅ Chain Enforcement
    const routeChainId = fromToken.chainId;
    if (chain?.id !== routeChainId) {
        logger.log(`⚠️ Chain mismatch. Switching to ${routeChainId}...`);
        try {
            await switchChainAsync({ chainId: routeChainId });
        } catch (error) {
            throw new Error('Chain switch failed. Please manually switch network.');
        }
    }
    
    // 2. ✅ Validate route age
    if (selectedRoute.timestamp) {
        const routeAge = Date.now() - selectedRoute.timestamp;
        const MAX_ROUTE_AGE = 60000; // 1 minute
        
        if (routeAge > MAX_ROUTE_AGE) {
        throw new Error(
            `Quote is stale (${Math.round(routeAge / 1000)}s old). Please refresh for latest rates.`
        );
        }
    }
    
    // 3. ✅ Re-check balance
    await checkBalance();
    
    // 4. ✅ Large Value Confirmation
    const inputUSD = parseFloat(selectedRoute.inputUSD || selectedRoute.fromAmountUSD || '0');
    if (inputUSD > 10000) {
      const outputAmount = selectedRoute.outputAmountFormatted || 'Unknown';
      const confirmed = window.confirm(
        `⚠️ LARGE SWAP DETECTED\n\n` +
        `Value: $${inputUSD.toLocaleString()}\n` +
        `Receive: ~${outputAmount} ${toToken?.symbol}\n\n` +
        `Continue?`
      );
      
      if (!confirmed) {
        throw new Error('Swap cancelled by user');
      }
    }

    // 5. ✅ Get fresh step transaction
    logger.log('Getting step transaction...');
    const stepTxData = await lifiService.getStepTransaction(selectedRoute);
    
    if (!stepTxData?.transactionRequest) {
      throw new Error('Failed to get transaction data from Li.Fi');
    }
    
    const txRequest = stepTxData.transactionRequest;
    
    if (!txRequest.to || !txRequest.data) {
      throw new Error('Invalid transaction data received');
    }

    // 6. ✅ Router Address Verification (Security)
    // Use selectedRoute.fromChainId or fromToken.chainId
    const chainId = fromToken.chainId; 
    const routerCheck = isApprovedRouter(txRequest.to, chainId);

    if (!routerCheck.approved) {
        const confirmed = window.confirm(
            `⚠️ SECURITY WARNING\n\n` +
            `Destination address is not in our verified list.\n` +
            `Address: ${txRequest.to}\n\n` +
            `Proceed anyway?`
        );
        if (!confirmed) throw new Error('Swap cancelled: Unknown router');
        
        analytics.track('Unknown Router Accepted', { address: txRequest.to, chain: chainId });
    }

    // 7. ✅ Gas Limit Checks
    if (txRequest.gasLimit) {
        const gasLimit = BigInt(txRequest.gasLimit);
        if (gasLimit > GAS_LIMITS.MAX_WARNING) {
            const confirmed = window.confirm(
                `🚨 EXTREMELY HIGH GAS LIMIT: ${gasLimit.toString()}\n\n` +
                `This is suspicious. Continue?`
            );
            if (!confirmed) throw new Error('Swap cancelled: High gas limit');
        }
    }
    
    // 8. ✅ Validate value for native tokens
    const isNative = fromToken.address === NATIVE_TOKEN_ADDRESS ||
                     fromToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    
    if (isNative) {
      const expectedValue = parseUnits(fromAmount, fromToken.decimals);
      const txValue = BigInt(txRequest.value || '0');
      
      // Allow 1% variance
      const start = (expectedValue * 99n) / 100n;
      const end = (expectedValue * 101n) / 100n;
      
      if (txValue < start || txValue > end) {
        throw new Error(`Transaction value mismatch. Expected ~${fromAmount} ${fromToken.symbol}`);
      }
    }
    
    // 9. ✅ Build parameters
    const txParams = {
      to: txRequest.to,
      data: txRequest.data,
      value: txRequest.value ? BigInt(txRequest.value) : 0n,
      gas: txRequest.gasLimit ? (BigInt(txRequest.gasLimit) * 120n) / 100n : undefined, // 20% buffer
    };
    
    // 10. ✅ Send Transaction
    logger.log('Sending transaction...', txParams);
    
    const hash = await sendTransactionAsync(txParams);
    
    logger.log(`✅ Transaction sent: ${hash}`);
    return { hash };
  };
  
  return { executeSwap };
};
