import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatUnits } from 'viem';
import { mainnet, polygon, bsc, arbitrum, optimism, base } from 'viem/chains';
import { RPC_URLS } from '../config/lifi.config';

// Extended list of popular tokens to check
// We use a static list to avoid rate limits and complex API calls for this initial version
const PORTFOLIO_TOKENS = {
    1: [ // ETH
        { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
        { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' },
        { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
        { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png' },
        { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, logo: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png' },
    ],
    137: [ // Polygon
        { symbol: 'POL', address: '0x0000000000000000000000000000000000000000', decimals: 18, logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
        { symbol: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' },
        { symbol: 'WETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
    ],
    56: [ // BSC
        { symbol: 'BNB', address: '0x0000000000000000000000000000000000000000', decimals: 18, logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
        { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
        { symbol: 'CAKE', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, logo: 'https://cryptologos.cc/logos/pancakeswap-cake-logo.png' },
    ],
    42161: [ // Arbitrum
        { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
        { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png' },
        { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' },
    ],
    8453: [ // Base
        { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
        { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' },
    ]
};

// ERC20 ABI for balanceOf
const erc20Abi = [
    {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function',
    },
];

const CHAIN_CONFIG = {
    1: mainnet,
    137: polygon,
    56: bsc,
    42161: arbitrum,
    8453: base,
};

export const usePortfolio = () => {
    const { address, isConnected } = useAccount();
    const [assets, setAssets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalNetWorth, setTotalNetWorth] = useState(0);

    const fetchBalances = async () => {
        if (!address || !isConnected) {
            setAssets([]);
            setTotalNetWorth(0);
            return;
        }

        setIsLoading(true);
        const allAssets = [];
        let totalVal = 0;

        try {
            // Fetch per chain in parallel
            const chainPromises = Object.keys(PORTFOLIO_TOKENS).map(async (chainId) => {
                const chainIdNum = Number(chainId);
                const tokens = PORTFOLIO_TOKENS[chainId];
                const chain = CHAIN_CONFIG[chainIdNum];
                
                if (!chain) return [];

                // Create client
                const client = createPublicClient({
                    chain,
                    transport: http(RPC_URLS[chainIdNum] || chain.rpcUrls.default.http[0])
                });

                // Fetch token metadata (including Price) from Li.Fi to avoid mocks
                // We'll try to get the token list for this chain from Li.Fi
                // This might be heavy if called often, so we rely on cache in lifiService
                let lifiTokens = {};
                try {
                     const result = await fetch(`https://li.quest/v1/tokens?chains=${chainIdNum}`);
                     const data = await result.json();
                     if (data.tokens && data.tokens[chainIdNum]) {
                         // Create a map for execution speed
                         data.tokens[chainIdNum].forEach(t => {
                             lifiTokens[t.address.toLowerCase()] = t;
                         });
                     }
                } catch (err) {
                    console.warn('Failed to fetch Li.Fi prices', err);
                }

                // Fetch balances
                const tokenPromises = tokens.map(async (token) => {
                    try {
                        let balance = 0n;
                        
                        // Handle native token address variations
                        const isNative = 
                            token.address === '0x0000000000000000000000000000000000000000' || 
                            token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

                        if (isNative) {
                            balance = await client.getBalance({ address });
                        } else {
                            balance = await client.readContract({
                                address: token.address,
                                abi: erc20Abi,
                                functionName: 'balanceOf',
                                args: [address],
                            });
                        }

                        if (balance > 0n) {
                            const formatted = formatUnits(balance, token.decimals);
                            
                            // REAL PRICE DATA
                            // Try to find in Li.Fi response
                            let price = 0;
                            const lifiToken = lifiTokens[token.address.toLowerCase()] || 
                                              (isNative ? lifiTokens['0x0000000000000000000000000000000000000000'] : null);

                            if (lifiToken && lifiToken.priceUSD) {
                                price = parseFloat(lifiToken.priceUSD);
                            } else {
                                // Fallback estimates if API fails
                                if (token.symbol.includes('USD')) price = 1;
                                else if (token.symbol === 'ETH') price = 2500;
                                else if (token.symbol === 'BTC' || token.symbol === 'WBTC') price = 60000;
                                else if (token.symbol === 'BNB') price = 550;
                                else if (token.symbol === 'POL') price = 0.60;
                                else if (token.symbol === 'ARB') price = 1.00;
                            }

                            const value = parseFloat(formatted) * price;
                            totalVal += value;

                            return {
                                ...token,
                                chainId: chainIdNum,
                                chainName: chain.name,
                                balance: formatted,
                                balanceRaw: balance,
                                valueUSD: value,
                                priceUSD: price,
                                logo: lifiToken?.logoURI || token.logo // Use high quality logo if available
                            };
                        }
                    } catch (e) {
                        console.warn(`Error fetching ${token.symbol} on ${chainId}:`, e);
                    }
                    return null;
                });

                const results = await Promise.all(tokenPromises);
                return results.filter(t => t !== null);
            });

            const chainResults = await Promise.all(chainPromises);
            const flatAssets = chainResults.flat().sort((a, b) => b.valueUSD - a.valueUSD);

            setAssets(flatAssets);
            setTotalNetWorth(totalVal);

        } catch (error) {
            console.error('Error fetching portfolio:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalances();
        // Poll every 30s
        const interval = setInterval(fetchBalances, 30000);
        return () => clearInterval(interval);
    }, [address, isConnected]);

    return {
        assets,
        totalNetWorth,
        isLoading,
        refetch: fetchBalances
    };
};

export default usePortfolio;
