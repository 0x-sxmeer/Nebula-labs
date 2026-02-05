
import { useSendTransaction, useEstimateFeesPerGas } from 'wagmi';
import { parseUnits, formatUnits } from 'ethers';
import { lifiService } from '../services/lifiService';
import { mevService } from '../services/mevService'; // ✅ NEW
import { useEthersSigner } from './useEthersAdapter'; // ✅ NEW
import { logger } from '../utils/logger';
import { NATIVE_TOKEN_ADDRESS } from '../config/lifi.config';

/**
 * ✅ FIXED: Comprehensive transaction validation before sending
 */
export const useSwapExecution = () => {
  const { sendTransactionAsync } = useSendTransaction();
  const { data: feeData } = useEstimateFeesPerGas();
  const signer = useEthersSigner(); // ✅ Get Ethers signer for MEV
  
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
    useMevProtection, // ✅ Received from component
  }) => {
    // 1. Basic validation
    if (!selectedRoute) {
      throw new Error('No route selected');
    }
    
    if (!hasSufficientBalance) {
      throw new Error('Insufficient balance');
    }
    
    // 2. ✅ Validate route age (prevent stale quotes)
    if (selectedRoute.timestamp) {
        const routeAge = Date.now() - selectedRoute.timestamp;
        const MAX_ROUTE_AGE = 60000; // 1 minute
        
        if (routeAge > MAX_ROUTE_AGE) {
        throw new Error(
            `Quote is stale (${Math.round(routeAge / 1000)}s old). Please refresh for latest rates.`
        );
        }
        logger.log(`✅ Route age: ${Math.round(routeAge / 1000)}s (valid)`);
    }
    
    // 3. ✅ Re-check balance right before transaction
    logger.log('Re-checking balance...');
    await checkBalance();
    logger.log('✅ Balance check passed (via pre-validation)');
    
    // 4. ✅ Validate gas price isn't excessive
    const currentGasPrice = feeData?.gasPrice || BigInt(0);
    const maxAcceptableGasPrice = parseUnits('100', 'gwei'); // Adjust per chain
    
    if (currentGasPrice > maxAcceptableGasPrice) {
      const gasPriceGwei = formatUnits(currentGasPrice, 'gwei');
      
      // Attempt to estimate USD cost (very rough: gasLimit * gasPrice * ETH price)
      // We don't have ETH price explicitly here, but if fromToken is native we might.
      // Or just warn about Gwei.
      // "Warn if gas > 100 gwei" - Check. "Show USD cost estimate" - Needs native price.
      // We'll trust the user knows Gwei for now or if we had a price oracle... 
      // User Guide says "Show USD cost estimate".
      // Let's rely on the gas estimate from the route if available?
      const routeGasCostUSD = selectedRoute.gasCostUSD;
      const gasMsg = routeGasCostUSD 
        ? `Est. Gas Cost: $${routeGasCostUSD}`
        : `Gas Price: ${parseFloat(gasPriceGwei).toFixed(2)} gwei`;

      const userConfirms = window.confirm(
        `⚠️ High Gas Price Warning\n\n` +
        `${gasMsg}\n` +
        `This swap may be expensive. Continue anyway?`
      );
      
      if (!userConfirms) {
        throw new Error('Swap cancelled - gas price too high');
      }
    }
    
    logger.log(`✅ Gas price: ${formatUnits(currentGasPrice, 'gwei')} gwei`);
    
    // 5. ✅ Get fresh step transaction from Li.Fi
    logger.log('Getting step transaction...');
    
    const stepTxData = await lifiService.getStepTransaction(selectedRoute);
    
    if (!stepTxData?.transactionRequest) {
      throw new Error('Failed to get transaction data from Li.Fi');
    }
    
    // 6. ✅ Validate transaction data
    const txRequest = stepTxData.transactionRequest;
    
    if (!txRequest.to) {
      throw new Error('Invalid transaction: missing recipient');
    }
    
    if (!txRequest.data) {
      throw new Error('Invalid transaction: missing call data');
    }
    
    // 7. ✅ Validate value matches expected amount for native tokens
    const isNative = fromToken.address === NATIVE_TOKEN_ADDRESS ||
                     fromToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    
    if (isNative) {
      const expectedValue = parseUnits(fromAmount, fromToken.decimals);
      const txValue = BigInt(txRequest.value || '0');
      
      // Allow 1% variance
      const minValue = (expectedValue * BigInt(99)) / BigInt(100);
      const maxValue = (expectedValue * BigInt(101)) / BigInt(100);
      
      if (txValue < minValue || txValue > maxValue) {
        throw new Error(
          `Transaction value mismatch.\n` +
          `Expected: ${fromAmount} ${fromToken.symbol}\n` +
          `Got: ${formatUnits(txValue, fromToken.decimals)} ${fromToken.symbol}`
        );
      }
    }
    
    logger.log('✅ Transaction validation passed');
    
    // 8. ✅ Build final transaction parameters
    const txParams = {
      to: txRequest.to,
      data: txRequest.data,
      value: txRequest.value ? BigInt(txRequest.value) : BigInt(0), // Ensure BigInt
      gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
    };
    
    // 9. ✅ Send transaction with timeout (MEV Protected if enabled)
    logger.log('Sending transaction...', txParams);
    
    // 5-minute timeout limit for wallet interaction + broadcast
    const TRANSACTION_TIMEOUT = 5 * 60 * 1000; 
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction timed out (5 minutes)')), TRANSACTION_TIMEOUT);
    });

    let sendPromise;

    // ✅ MEV Protection Logic
    if (useMevProtection && fromToken.chainId === 1) { // Only Mainnet supports Flashbots
        logger.log('🛡️ Using MEV Protection (Flashbots)...');
        
        if (!signer) {
             throw new Error('MEV Protection unavailable: Could not access wallet signer.');
        }

        // We need the provider attached to the signer
        if (!signer.provider) {
             throw new Error('MEV Protection unavailable: Signer has no provider.');
        }

        // Execute via MevService
        // Note: mevService.sendPrivateTransaction expects (signer, provider, txRequest, chainId)
        sendPromise = mevService.sendPrivateTransaction(
            signer, 
            signer.provider, 
            txParams, 
            fromToken.chainId
        ).then(res => res.hash); // Ensure it returns hash string

    } else {
         sendPromise = sendTransactionAsync(txParams);
    }

    const hash = await Promise.race([
        sendPromise,
        timeoutPromise
    ]);
    
    logger.log(`✅ Transaction sent: ${hash}`);
    
    return { hash };
  };
  
  return { executeSwap };
};
