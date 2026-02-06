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
        exportToCSV, // ✅ Expose export function
        isEmpty: history.length === 0
    };
};

export default useSwapHistory;
