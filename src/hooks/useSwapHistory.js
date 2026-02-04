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

    return {
        history,
        isLoading,
        saveSwap,
        updateStatus,
        clearHistory,
        getExplorerUrl,
        isEmpty: history.length === 0
    };
};

export default useSwapHistory;
