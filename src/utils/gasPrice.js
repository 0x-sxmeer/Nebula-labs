/**
 * Real-time gas price fetcher
 * Falls back through multiple sources for accuracy
 */

import { logger } from './logger';

const GAS_APIS = {
  ethereum: [
    'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
    'https://gas-api.metaswap.codefi.network/networks/1/suggestedGasFees',
  ],
};

/**
 * Fetch current gas prices with fallback
 * @param {number} chainId - Chain ID (1 = Ethereum)
 * @param {string} speed - 'slow', 'standard', or 'fast'
 * @returns {Promise<string>} Gas price in wei
 */
export async function getRealTimeGasPrice(chainId = 1, speed = 'standard') {
  // Only support Ethereum for now
  if (chainId !== 1) {
    return null; // Let Li.Fi handle other chains
  }

  // Try Etherscan first
  try {
    const response = await fetch(GAS_APIS.ethereum[0]);
    const data = await response.json();
    
    if (data.status === '1' && data.result) {
      // Etherscan returns Fast, Average, SafeGas in Gwei
      let gwei;
      switch (speed) {
        case 'slow':
          gwei = data.result.SafeGasPrice || data.result.suggestBaseFee;
          break;
        case 'fast':
          gwei = data.result.FastGasPrice;
          break;
        default: // standard
          gwei = data.result.ProposeGasPrice || data.result.suggestBaseFee;
      }
      
      const wei = BigInt(Math.floor(parseFloat(gwei) * 1e9));
      logger.log(`⛽ Real-time gas (${speed}): ${gwei} Gwei`);
      return wei.toString();
    }
  } catch (error) {
    logger.warn('Etherscan gas price fetch failed:', error);
  }

  // Try MetaMask API as fallback
  try {
    const response = await fetch(GAS_APIS.ethereum[1]);
    const data = await response.json();
    
    let gwei;
    switch (speed) {
      case 'slow':
        gwei = data.low?.suggestedMaxFeePerGas;
        break;
      case 'fast':
        gwei = data.high?.suggestedMaxFeePerGas;
        break;
      default: // standard
        gwei = data.medium?.suggestedMaxFeePerGas;
    }
    
    if (gwei) {
      const wei = BigInt(Math.floor(parseFloat(gwei) * 1e9));
      logger.log(`⛽ Real-time gas (${speed}): ${gwei} Gwei (MetaMask API)`);
      return wei.toString();
    }
  } catch (error) {
    logger.warn('MetaMask gas price fetch failed:', error);
  }

  return null; // No gas price available
}

/**
 * Get gas speed multiplier for adjusting estimates
 */
export function getGasMultiplier(speed) {
  switch (speed) {
    case 'slow':
      return 0.8;
    case 'fast':
      return 1.5;
    default:
      return 1.0;
  }
}
