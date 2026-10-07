/**
 * Swap History Service
 * Manages localStorage-based transaction history for user swaps
 */

const STORAGE_KEY = 'swap_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * @typedef {Object} SwapHistoryItem
 * @property {string} id - Transaction hash
 * @property {number} timestamp - Unix timestamp
 * @property {Object} fromToken - Source token details
 * @property {Object} toToken - Destination token details
 * @property {string} fromAmount - Amount swapped
 * @property {string} toAmount - Amount received
 * @property {Object} fromChain - Source chain
 * @property {Object} toChain - Destination chain
 * @property {'pending'|'completed'|'failed'} status
 * @property {string} [provider] - DEX/Bridge used
 * @property {string} [explorerUrl] - Block explorer link
 */

class SwapHistoryService {
    constructor() {
        this.listeners = new Set();
    }

    /**
     * Get all history items for a specific wallet
     * @param {string} walletAddress - User's wallet address
     * @returns {SwapHistoryItem[]}
     */
    getHistory(walletAddress) {
        if (!walletAddress) return [];
        
        try {
            const key = `${STORAGE_KEY}_${walletAddress.toLowerCase()}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load swap history:', error);
            return [];
        }
    }

    /**
     * Save a new swap to history
     * @param {string} walletAddress
     * @param {Object} swap - Swap details
     */
    saveSwap(walletAddress, swap) {
        if (!walletAddress || !swap.id) return;

        try {
            const key = `${STORAGE_KEY}_${walletAddress.toLowerCase()}`;
            const history = this.getHistory(walletAddress);
            
            // Check if already exists (update if so)
            const existingIndex = history.findIndex(item => item.id === swap.id);
            if (existingIndex >= 0) {
                history[existingIndex] = { ...history[existingIndex], ...swap };
            } else {
                // Add to beginning
                history.unshift({
                    id: swap.id,
                    timestamp: swap.timestamp || Date.now(),
                    fromToken: {
                        symbol: swap.fromToken?.symbol,
                        address: swap.fromToken?.address,
                        logoURI: swap.fromToken?.logoURI,
                        decimals: swap.fromToken?.decimals
                    },
                    toToken: {
                        symbol: swap.toToken?.symbol,
                        address: swap.toToken?.address,
                        logoURI: swap.toToken?.logoURI,
                        decimals: swap.toToken?.decimals
                    },
                    fromAmount: swap.fromAmount,
                    toAmount: swap.toAmount,
                    fromChain: {
                        id: swap.fromChain?.id,
                        name: swap.fromChain?.name,
                        logo: swap.fromChain?.logo || swap.fromChain?.logoURI
                    },
                    toChain: {
                        id: swap.toChain?.id,
                        name: swap.toChain?.name,
                        logo: swap.toChain?.logo || swap.toChain?.logoURI
                    },
                    status: swap.status || 'pending',
                    provider: swap.provider,
                    explorerUrl: swap.explorerUrl,
                    inputUSD: swap.inputUSD,
                    outputUSD: swap.outputUSD
                });
            }

            // Trim to max items
            const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
            localStorage.setItem(key, JSON.stringify(trimmed));
            
            // Notify listeners
            this.notifyListeners(walletAddress);
            
        } catch (error) {
            console.error('Failed to save swap to history:', error);
        }
    }

    /**
     * Update swap status
     * @param {string} walletAddress
     * @param {string} txHash
     * @param {'pending'|'completed'|'failed'} status
     * @param {Object} [updates] - Additional fields to update
     */
    updateStatus(walletAddress, txHash, status, updates = {}) {
        if (!walletAddress || !txHash) return;

        try {
            const key = `${STORAGE_KEY}_${walletAddress.toLowerCase()}`;
            const history = this.getHistory(walletAddress);
            
            const index = history.findIndex(item => item.id === txHash);
            if (index >= 0) {
                history[index] = {
                    ...history[index],
                    status,
                    ...updates,
                    updatedAt: Date.now()
                };
                localStorage.setItem(key, JSON.stringify(history));
                this.notifyListeners(walletAddress);
            }
        } catch (error) {
            console.error('Failed to update swap status:', error);
        }
    }

    /**
     * Clear all history for a wallet
     * @param {string} walletAddress
     */
    clearHistory(walletAddress) {
        if (!walletAddress) return;
        
        try {
            const key = `${STORAGE_KEY}_${walletAddress.toLowerCase()}`;
            localStorage.removeItem(key);
            this.notifyListeners(walletAddress);
        } catch (error) {
            console.error('Failed to clear swap history:', error);
        }
    }

    /**
     * Subscribe to history changes
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of changes
     */
    notifyListeners(walletAddress) {
        this.listeners.forEach(callback => {
            try {
                callback(walletAddress);
            } catch (e) {
                console.error('History listener error:', e);
            }
        });
    }

    /**
     * Generate explorer URL for a transaction
     * @param {number} chainId
     * @param {string} txHash
     * @returns {string}
     */
    getExplorerUrl(chainId, txHash) {
        const explorers = {
            1: 'https://etherscan.io/tx/',
            137: 'https://polygonscan.com/tx/',
            56: 'https://bscscan.com/tx/',
            42161: 'https://arbiscan.io/tx/',
            10: 'https://optimistic.etherscan.io/tx/',
            8453: 'https://basescan.org/tx/',
            43114: 'https://snowtrace.io/tx/',
            250: 'https://ftmscan.com/tx/',
            100: 'https://gnosisscan.io/tx/'
        };
        
        const base = explorers[chainId] || 'https://etherscan.io/tx/';
        return `${base}${txHash}`;
    }

    /**
     * Check status via Li.Fi API (Helper)
     */
    async getLiFiStatus(item) {
        // Dynamic import to avoid circular dependencies if possible, 
        // or just import at top. But service-to-service can be tricky.
        // Let's assume lifiService is available. 
        // Actually, importing `lifiService` here might be circular if `lifiService` imports this.
        // `lifiService.js` does NOT import `swapHistoryService`. So it's safe.
        const { lifiService } = await import('./lifiService');
        
        try {
            return await lifiService.getStatus({
                txHash: item.id,
                bridge: item.provider,
                fromChain: item.fromChain?.id,
                toChain: item.toChain?.id
            });
        } catch (e) {
            console.warn('LiFi Status Check failed:', e);
            return null;
        }
    }
}

export const swapHistoryService = new SwapHistoryService();
export default swapHistoryService;
