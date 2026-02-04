import { useState, useEffect, useRef, useCallback } from 'react';
import { lifiService } from '../services/lifiService';

export const STATUS = {
    IDLE: 'IDLE',
    PENDING: 'PENDING',
    DONE: 'DONE',
    FAILED: 'FAILED',
    NOT_FOUND: 'NOT_FOUND'
};

export const useTransactionStatus = () => {
    const [status, setStatus] = useState(STATUS.IDLE);
    const [subStatus, setSubStatus] = useState('');
    const [subStatusMsg, setSubStatusMsg] = useState('');
    const [txLink, setTxLink] = useState(null);
    const [receivingTx, setReceivingTx] = useState(null);
    const [error, setError] = useState(null);
    
    const [activeAuth, setActiveAuth] = useState(null); // { txHash, bridge, fromChain, toChain }
    const pollTimer = useRef(null);
    const attempts = useRef(0);

    const startTracking = useCallback((txData) => {
        // txData: { txHash, bridge, fromChain, toChain }
        setActiveAuth(txData);
        setStatus(STATUS.PENDING);
        setSubStatus('WAITING_FOR_BRIDGE');
        setSubStatusMsg('Waiting for bridge to pick up transaction...');
        setTxLink(null);
        setReceivingTx(null);
        setError(null);
        attempts.current = 0;
    }, []);

    const stopTracking = useCallback(() => {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setActiveAuth(null);
    }, []);

    // Maximum polling attempts: 200 * 3s = 10 minutes timeout
    const MAX_ATTEMPTS = 200;

    const poll = useCallback(async () => {
        if (!activeAuth) return;

        // Timeout check - prevent infinite polling
        if (attempts.current > MAX_ATTEMPTS) {
            console.warn('⏱️ Transaction tracking timed out after 10 minutes');
            setStatus(STATUS.NOT_FOUND);
            setError('Transaction tracking timed out. Please check the block explorer.');
            stopTracking();
            return;
        }

        try {
            const data = await lifiService.getStatus(activeAuth);
            
            // Log for debugging
            console.log('📡 Status Update:', data);

            if (!data) {
                // Keep polling if not found yet (could be indexing delay)
                if (attempts.current > 20) { // Stop after ~1 min if literally nothing found
                     setStatus(STATUS.NOT_FOUND);
                     stopTracking();
                }
                return;
            }

            setStatus(data.status); // DONE, PENDING, FAILED
            setSubStatus(data.subStatus);
            setSubStatusMsg(data.subStatusMsg || data.subStatus);
            
            if (data.receiving?.txHash) {
                setReceivingTx(data.receiving.txHash);
            }
            if (data.active?.txLink) {
                setTxLink(data.active.txLink);
            }

            if (data.status === 'DONE' || data.status === 'FAILED') {
                // Dry Run Fix: Break Point #10 - Verify destination chain for cross-chain swaps
                const isCrossChain = data.sending?.chainId !== data.receiving?.chainId;
                
                if (data.status === 'DONE' && isCrossChain && !data.receiving?.txHash) {
                    // Source done, but destination pending
                    setStatus(STATUS.PENDING);
                    setSubStatus('WAITING_FOR_DESTINATION');
                    setSubStatusMsg('Bridge completed on source, waiting for destination chain...');
                    return; // Keep polling
                }

                stopTracking();
                if (data.status === 'FAILED') {
                     setError(data.subStatusMsg || 'Transaction failed on-chain');
                }
            }

        } catch (err) {
            console.warn('Poll failed', err);
            // Don't stop immediately on network error, retry
        } finally {
            attempts.current++;
        }
    }, [activeAuth, stopTracking]);

    // Note: poll is intentionally NOT in dependencies to prevent interval reset on every render
    // The ref (pollTimer) ensures we always call the latest poll function
    useEffect(() => {
        if (activeAuth && (status === STATUS.PENDING || status === STATUS.IDLE)) {
            pollTimer.current = setInterval(poll, 3000); // Poll every 3s
        }
        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeAuth, status]); // ✅ Removed poll to prevent interval reset

    const resetStatus = useCallback(() => {
        setStatus(STATUS.IDLE);
        setSubStatus('');
        setSubStatusMsg('');
        setTxLink(null);
        setReceivingTx(null);
        setError(null);
        stopTracking();
    }, [stopTracking]);

    return {
        status,
        subStatus,
        subStatusMsg,
        txLink,
        receivingTx,
        error,
        startTracking,
        stopTracking,
        resetStatus
    };
};
