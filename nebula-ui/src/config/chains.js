/**
 * Chain Configuration & Constants
 * Externalized for better maintainability (Upgrade Task #14)
 */

export const POPULAR_CHAINS = [
    { id: 1, name: 'Ethereum', key: 'ETH', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
    { id: 137, name: 'Polygon', key: 'POL', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
    { id: 56, name: 'BNB Chain', key: 'BSC', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
    { id: 42161, name: 'Arbitrum', key: 'ARB', logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png' },
    { id: 10, name: 'Optimism', key: 'OPT', logo: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png' },
    { id: 8453, name: 'Base', key: 'BASE', logo: 'https://avalabs.org/images/base-logo.png' },
    { id: 43114, name: 'Avalanche', key: 'AVAX', logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
    { id: 1151111081099710, name: 'Solana', key: 'SOL', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
    { id: 20000000000001, name: 'Bitcoin', key: 'BTC', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
];

export const POPULAR_TOKEN_SYMBOLS = [
    'ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'BNB', 'MATIC', 'POL', // Polygon
    'SOL', 'BTC', 'AVAX', 'OP', 'ARB', // L1s & L2s
    'USDC.e', 'USDT.e', 'DAI.e', // Bridged stables
    'MNT', 'METIS', 'GNO', 'CRO', 'WMATIC', 'WBNB'
];

export const FALLBACK_TOKENS = {
    1: [ // Ethereum
        { symbol: 'ETH', name: 'Ethereum', decimals: 18, address: '0x0000000000000000000000000000000000000000', logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', priceUSD: '2500.00', chainId: 1 },
        { symbol: 'USDC', name: 'USDC', decimals: 6, address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', priceUSD: '1.00', chainId: 1 },
        { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xdac17f958d2ee523a2206206994597c13d831ec7', logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png', priceUSD: '1.00', chainId: 1 },
        { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', logoURI: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png', priceUSD: '50000.00', chainId: 1 },
    ],
    137: [ // Polygon
        { symbol: 'POL', name: 'Polygon', decimals: 18, address: '0x0000000000000000000000000000000000000000', logoURI: 'https://cryptologos.cc/logos/polygon-matic-logo.png', priceUSD: '0.80', chainId: 137 },
        { symbol: 'USDC', name: 'USDC', decimals: 6, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', priceUSD: '1.00', chainId: 137 },
        { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', priceUSD: '2500.00', chainId: 137 },
    ],
    56: [ // BSC
        { symbol: 'BNB', name: 'BNB', decimals: 18, address: '0x0000000000000000000000000000000000000000', logoURI: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', priceUSD: '400.00', chainId: 56 },
        { symbol: 'USDT', name: 'Tether USD', decimals: 18, address: '0x55d398326f99059fF775485246999027B3197955', logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png', priceUSD: '1.00', chainId: 56 },
    ],
    42161: [ // Arbitrum
        { symbol: 'ETH', name: 'Ethereum', decimals: 18, address: '0x0000000000000000000000000000000000000000', logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', priceUSD: '2500.00', chainId: 42161 },
        { symbol: 'ARB', name: 'Arbitrum', decimals: 18, address: '0x912CE59144191C1204E64559FE8253a0e49E6548', logoURI: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png', priceUSD: '1.50', chainId: 42161 },
        { symbol: 'USDC', name: 'USDC', decimals: 6, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', priceUSD: '1.00', chainId: 42161 },
    ],
    10: [ // Optimism
        { symbol: 'ETH', name: 'Ethereum', decimals: 18, address: '0x0000000000000000000000000000000000000000', logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', priceUSD: '2500.00', chainId: 10 },
        { symbol: 'OP', name: 'Optimism', decimals: 18, address: '0x4200000000000000000000000000000000000042', logoURI: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png', priceUSD: '3.00', chainId: 10 },
        { symbol: 'USDC', name: 'USDC', decimals: 6, address: '0x0b2C639c533813f4Aa9D7837CAf992cL9dcd5ce0', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', priceUSD: '1.00', chainId: 10 },
    ],
    1151111081099710: [ // Solana
        { symbol: 'SOL', name: 'Solana', decimals: 9, address: '11111111111111111111111111111111', logoURI: 'https://cryptologos.cc/logos/solana-sol-logo.png', priceUSD: '100.00', chainId: 1151111081099710 },
        { symbol: 'USDC', name: 'USDC', decimals: 6, address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', priceUSD: '1.00', chainId: 1151111081099710 },
    ]
};

export const PRIORITY_TOKEN_ADDRESSES = {
    // Hyperliquid (1337): Prioritize Bridged USDC (Arbitrum One USDC address used on HL)
    1337: ['0xaf88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase()]
};

export const LARGE_CHAIN_ID_THRESHOLD = 1000000000;

export const getChainName = (chainId) => {
    const chain = POPULAR_CHAINS.find(c => c.id === Number(chainId));
    return chain ? chain.name : `Chain ${chainId}`;
};
