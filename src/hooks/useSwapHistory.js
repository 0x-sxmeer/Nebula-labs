/**
 * useSwapHistory Hook
 * React hook for accessing and managing swap history
 */

import { useState, useEffect, useCallback } from 'react';
import { swapHistoryService } from '../services/swapHistoryService';

export const useSwapHistory = (walletAddress) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load history on mount and when wallet changes
    useEffect(() => {
        setIsLoading(true);
        const data = swapHistoryService.getHistory(walletAddress);
        setHistory(data);
        setIsLoading(false);
    }, [walletAddress]);

    // Subscribe to changes
    useEffect(() => {
        const unsubscribe = swapHistoryService.subscribe((updatedWallet) => {
            if (updatedWallet?.toLowerCase() === walletAddress?.toLowerCase()) {
                const data = swapHistoryService.getHistory(walletAddress);
                setHistory(data);
            }
        });
        return unsubscribe;
    }, [walletAddress]);

    // ✅ AUTO-RECOVERY: Check pending transactions on mount
    const refreshStatus = useCallback(async () => {
        if (!walletAddress) return;
        
        setIsLoading(true);
        const currentHistory = swapHistoryService.getHistory(walletAddress);
        if (pendingItems.length === 0) {
            setIsLoading(false);
            return;
        }

        if (window.showNotification) {
             window.showNotification({ type: 'info', title: 'Checking Status', message: `Verifying ${pendingItems.length} transactions...` });
        }



        try {
            // Dynamic import
            const { createPublicClient, http, fallback } = await import('viem');
            const { mainnet, bsc, polygon, arbitrum, optimism, base, avalanche, fantom, gnosis } = await import('viem/chains');

            const getChain = (chainId) => {
                const cid = Number(chainId);
                const chains = { 1: mainnet, 56: bsc, 137: polygon, 42161: arbitrum, 10: optimism, 8453: base, 43114: avalanche, 250: fantom, 100: gnosis };
                return chains[cid];
            };
            
            const getTransport = (chainId) => {
                 const cid = Number(chainId);
                 if (cid === 56) return fallback([http('https://bsc-dataseed1.binance.org'), http('https://bsc-dataseed2.binance.org')]);
                 if (cid === 137) return fallback([http('https://polygon-rpc.com'), http('https://rpc.ankr.com/polygon')]);
                 if (cid === 1) return fallback([http('https://cloudflare-eth.com'), http('https://rpc.ankr.com/eth')]);
                 return http();
            };

            for (const item of pendingItems) {
                try {
                    if (Date.now() - item.timestamp < 5000) continue;

                    const fromChainId = Number(item.fromChain?.id);
                    const toChainId = Number(item.toChain?.id);
                    const isCrossChain = fromChainId !== toChainId;
                    const chain = getChain(fromChainId);

                    if (!chain) {
                        console.warn(`Unknown chain ${fromChainId} for item ${item.id}`);
                        continue;
                    }

                    const client = createPublicClient({
                        chain,
                        transport: getTransport(fromChainId)
                    });


                    
                    let receipt = null;
                    try {
                        receipt = await client.getTransactionReceipt({ hash: item.id });
                    } catch (e) {
                        // console.log(`Receipt fetch failed for ${item.id}:`, e.message);
                    }

                    if (receipt) {
                        if (receipt.status === 'reverted') {
                             // console.log(`❌ Transaction ${item.id} reverted on-chain.`);
                             swapHistoryService.updateStatus(walletAddress, item.id, 'failed');
                             // Removed spammy notification inside loop
                             continue;
                        } else if (receipt.status === 'success') {
                             if (!isCrossChain) {
                                 // console.log(`✅ Same-chain swap ${item.id} confirmed on-chain!`);
                                 swapHistoryService.updateStatus(walletAddress, item.id, 'completed');
                                 // Removed spammy notification inside loop
                                 continue;
                             } else {
                                 // console.log(`✅ Bridge source tx ${item.id} confirmed. Checking bridge status...`);
                                 
                                 const statusData = await swapHistoryService.getLiFiStatus(item);
                                 if (statusData && (statusData.status === 'DONE' || statusData.status === 'SUCCESS')) {
                                     swapHistoryService.updateStatus(walletAddress, item.id, 'completed');
                                 } else if (statusData && (statusData.status === 'FAILED' || statusData.status === 'INVALID')) {
                                     swapHistoryService.updateStatus(walletAddress, item.id, 'failed');
                                 }
                                 continue;
                             }
                        }
                    }
                    
                    if (isCrossChain) {
                         const statusData = await swapHistoryService.getLiFiStatus(item);
                         if (statusData && (statusData.status === 'DONE' || statusData.status === 'SUCCESS')) {
                             swapHistoryService.updateStatus(walletAddress, item.id, 'completed');
                         }
                    }

                } catch (e) {
                    console.error('Failed to check status for', item.id, e);
                }
            }
        } catch (error) {
            console.error('Critical error in history refresh:', error);
            if (window.showNotification) {
                 window.showNotification({ type: 'error', title: 'History Update Error', message: 'Failed to update transaction history.' });
            }
        } finally {
            setIsLoading(false);
            if (window.showNotification) {
                 window.showNotification({ type: 'success', title: 'History Updated', message: 'Status check complete.' });
            }
        }
    }, [walletAddress]);

    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    /**
     * Save a new swap to history
     */
    const saveSwap = useCallback((swap) => {
        swapHistoryService.saveSwap(walletAddress, swap);
    }, [walletAddress]);

    /**
     * Update swap status
     */
    const updateStatus = useCallback((txHash, status, updates) => {
        swapHistoryService.updateStatus(walletAddress, txHash, status, updates);
    }, [walletAddress]);

    /**
     * Clear all history
     */
    const clearHistory = useCallback(() => {
        swapHistoryService.clearHistory(walletAddress);
    }, [walletAddress]);

    /**
     * Get explorer URL
     */
    const getExplorerUrl = useCallback((chainId, txHash) => {
        return swapHistoryService.getExplorerUrl(chainId, txHash);
    }, []);

    /**
     * Export history to CSV
     */
    const exportToCSV = useCallback(() => {
        const headers = ['Date', 'From Token', 'Amount', 'To Token', 'Amount', 'Status', 'Tx Hash', 'Explorer URL'];
        const rows = history.map(item => [
            new Date(item.timestamp).toISOString(),
            item.fromToken?.symbol || 'Unknown',
            item.fromAmount || '0',
            item.toToken?.symbol || 'Unknown',
            item.toAmount || '0',
            item.status,
            item.id,
            swapHistoryService.getExplorerUrl(item.fromChain?.id, item.id)
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `nebula_swap_history_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [history]);

    return {
        history,
        isLoading,
        saveSwap,
        updateStatus,
        clearHistory,
        getExplorerUrl,
        exportToCSV,
        refreshStatus, // ✅ Exposed
        isEmpty: history.length === 0
    };
};

export default useSwapHistory;
