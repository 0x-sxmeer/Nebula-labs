
import { lifiService } from './src/services/lifiService.js';

async function checkUSDC() {
    console.log('Fetching tokens for Chain 1...');
    try {
        const tokens = await lifiService.getTokens(1);
        const usdc = tokens.find(t => t.symbol === 'USDC');
        const eth = tokens.find(t => t.symbol === 'ETH');
        
        console.log('ETH Price:', eth?.priceUSD);
        console.log('USDC Price:', usdc?.priceUSD);
        console.log('USDC Object:', JSON.stringify(usdc, null, 2));
        
        if (usdc && parseFloat(usdc.priceUSD) > 1000) {
            console.error('CRITICAL: USDC has ETH-like price!');
        } else {
            console.log('USDC Price looks normal.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

checkUSDC();
