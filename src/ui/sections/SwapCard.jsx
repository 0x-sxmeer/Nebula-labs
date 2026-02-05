
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowingCard } from '../shared/GlowingCard';
import { ArrowDown, Zap, RefreshCw, AlertCircle, Settings, Info, TrendingUp, CheckCircle, ChevronDown, Activity, ShieldCheck, ArrowLeft, GitMerge, Layers, Percent, Wallet, AlertTriangle, ArrowRight, DollarSign, History, Lock, Unlock, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import ChainTokenSelector from '../shared/ChainTokenSelector';
import Skeleton from '../shared/Skeleton';
import Tooltip from '../shared/Tooltip';
import SwapHistory from './SwapHistory';
import ErrorBoundary from '../shared/ErrorBoundary';
import useSwap from '../../hooks/useSwap';
import { useSwapHistory } from '../../hooks/useSwapHistory';
import { useTokenApproval, ApprovalStatus } from '../../hooks/useTokenApproval';
import { useSwapExecution } from '../../hooks/useSwapExecution';
import { useTransactionStatus } from '../../hooks/useTransactionStatus';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { lifiService } from '../../services/lifiService';
import { analytics } from '../../services/analyticsService';

import { formatErrorForDisplay } from '../../utils/errorHandler';
import { logger } from '../../utils/logger';
import { LARGE_CHAIN_ID_THRESHOLD, NATIVE_TOKEN_ADDRESS } from '../../config/lifi.config';
import { formatUnits } from 'viem';
import { isValidAddress } from '../../utils/securityHelpers';
import { validateAmount, validateSlippage, validateRoute } from '../../utils/validation';
import { getRecommendedSlippage } from '../../utils/slippageValidator';
import './SwapCard.css';
import './SwapCard_Tools.css';


// Animation Variants
const fadeInUp = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
};

const PriceImpactWarning = ({ impact }) => {
  if (impact < 1) return null;
  
  const severity = impact < 3 ? 'warning' : 'error';
  
  return (
    <div className={`price-impact-${severity}`} style={{
        padding: '10px',
        borderRadius: '8px',
        background: severity === 'warning' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 82, 82, 0.1)',
        border: `1px solid ${severity === 'warning' ? '#FFC107' : '#FF5252'}`,
        color: severity === 'warning' ? '#FFC107' : '#FF5252',
        marginBottom: '10px',
        fontSize: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    }}>
      <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
        <AlertTriangle size={16}/> 
        <span>High price impact: {impact.toFixed(2)}%</span>
      </div>
      {impact > 5 && <p style={{margin:0, opacity:0.8, fontSize:'0.75rem'}}>Consider splitting into smaller trades</p>}
    </div>
  );
};

// ✅ AUDIT ITEM #5: Rate Limit Warning
const RateLimitWarning = () => {
    const [status, setStatus] = useState(lifiService.getRateLimitStatus());

    useEffect(() => {
        const interval = setInterval(() => {
        setStatus(lifiService.getRateLimitStatus());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!status.limited) return null;

    return (
        <div className="warning-banner" style={{background: '#ff980022', border: '1px solid #ff9800', color: '#ff9800'}}>
             ⚠️ Rate limit reached. Retrying in {status.resetIn}s...
        </div>
    );
};

// ✅ AUDIT ITEM #8: MEV Protection Status
const MEVStatus = ({ slippage }) => {
  if (slippage > 0.01) { // > 1%
       return (
            <Tooltip content="High slippage increases risk of front-running (MEV) attacks.">
                <div style={{display:'flex', alignItems:'center', gap:'4px', color:'#ff9800', fontSize:'0.75rem', marginTop:'4px'}}>
                    <AlertCircle size={12} />
                    <span>MEV Risk: High</span>
                </div>
            </Tooltip>
       );
  }
  return (
       <div style={{display:'flex', alignItems:'center', gap:'4px', color:'#4caf50', fontSize:'0.75rem', marginTop:'4px'}}>
            <ShieldCheck size={12} />
            <span>Low MEV Risk</span>
       </div>
  );
};

// ✅ AUDIT ITEM #17: Terms Modal
const TermsModal = ({ onAccept }) => (
    <div className="terms-modal-overlay">
        <div className="terms-modal">
            <h3>Welcome to Nebula Swap</h3>
            <p>By using this platform, you agree to our Terms of Service and Privacy Policy.</p>
            <div className="terms-warning">
                <AlertTriangle size={16} />
                <span>This relies on beta smart contracts. Use at your own risk.</span>
            </div>
            <button className="primary-button" onClick={onAccept}>
                I Agree & Continue
            </button>
        </div>
    </div>
);



const SwapCard = () => {
    const { address: walletAddress, isConnected, chain } = useAccount();
    const { sendTransaction, data: txHash, isPending: isSending, error: txError, reset: resetTx } = useSendTransaction();
    const [manualHash, setManualHash] = useState(null);
    const activeHash = txHash || manualHash;
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: activeHash });
    const { switchChainAsync } = useSwitchChain();
    const currentChainId = useChainId();
    const { executeSwap, monitoringState } = useSwapExecution();
    
    // State for Flip
    const [isFlipped, setIsFlipped] = useState(false);
    const [routePriority, setRoutePriority] = useState('return'); // return | gas | time
    const [settingsView, setSettingsView] = useState('main'); // 'main' | 'bridges' | 'exchanges'
    const [toolSearch, setToolSearch] = useState('');
    
    const [executionError, setExecutionError] = useState(null);
    const [completedTxHash, setCompletedTxHash] = useState(null);
    const [showRouteDetails, setShowRouteDetails] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    

    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [useInfiniteApproval, setUseInfiniteApproval] = useState(false);



    const [gasSpeed, setGasSpeed] = useState('standard');
    const [customSlippage, setCustomSlippage] = useState('0.5');


    const [useAutoSlippage, setUseAutoSlippage] = useState(false);
    
    // Token Approval Hook
    const {
        fromToken, toToken, fromChain, toChain, fromAmount,
        routes, selectedRoute, loading, error,
        setFromToken, setToToken, setFromChain, setToChain, setFromAmount,
        setSelectedRoute, 
        refreshRoutes,
        slippage, setSlippage,
        isRefreshing, timeLeft,
        // Missing variables added
        checkBalance, loadingBalance, balance, hasSufficientBalance,
        availableBridges, availableExchanges, disabledBridges, disabledExchanges,
        setDisabledBridges, setDisabledExchanges,
        autoRefresh, setAutoRefresh,
        // Final missing variables
        switchTokens, customToAddress, setCustomToAddress, setIsExecuting
    } = useSwap(walletAddress); // Initialize useSwap hook

    // Initialize Swap History
    const { saveSwap, updateStatus, getExplorerUrl } = useSwapHistory(walletAddress);

    // Get the spender address from the selected route (LiFi router)
    // Dry Run Fix: Robust spender resolution
    const spenderAddress = selectedRoute?.steps?.[0]?.estimate?.approvalAddress || 
                          selectedRoute?.steps?.[0]?.transactionRequest?.to ||
                          selectedRoute?.transactionRequest?.to;

    const isNativeToken = fromToken?.address === '0x0000000000000000000000000000000000000000' ||
                         fromToken?.address?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
                         !fromToken?.address ||
                         fromToken?.address === NATIVE_TOKEN_ADDRESS;

    // Validate spender address if route is selected and not native token
    useEffect(() => {
        if (selectedRoute && !isNativeToken && !spenderAddress) {
            console.error('❌ Missing spender address in route:', selectedRoute);
        }
    }, [selectedRoute, isNativeToken, spenderAddress]);

    // High Priority #2: Network Connectivity Detection
    useEffect(() => {
        const handleOffline = () => {
             setExecutionError({
                title: 'No Internet Connection',
                message: 'You appear to be offline. Please check your internet connection.',
                recoverable: true
             });
        };
        
        // Optional: Auto-recover/refresh when back online could be added here
        
        window.addEventListener('offline', handleOffline);
        return () => window.removeEventListener('offline', handleOffline);
    }, []);
    
    
    const {
        status: approvalStatus,
        needsApproval,
        isApproved,
        isPending: isApprovalPending,
        isChecking: isCheckingApproval,
        requestApproval,
        error: approvalError,
        resetError: resetApprovalError // Issue #8 fix: Allow resetting error for retries
    } = useTokenApproval({
        tokenAddress: fromToken?.address,
        ownerAddress: walletAddress,
        spenderAddress: spenderAddress,
        amount: fromAmount,
        decimals: fromToken?.decimals || 18,
        isNative: isNativeToken
    });

    // Issue #8 fix: Wrapper to clear errors before retrying approval
    const handleApprove = async (unlimited = false) => {
        resetApprovalError?.(); // Clear previous errors
        await requestApproval(unlimited); // Default to exact amount (safer)
    };
    
    // New Mock Settings States


    // Sync slippage
    useEffect(() => {
        setCustomSlippage((slippage * 100).toFixed(1));
    }, [slippage]);



    // Handle Transaction Success
    useEffect(() => {
        if (isSuccess && activeHash) {
            setCompletedTxHash(activeHash);
            // 🎉 Success Celebration
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }, [isSuccess, activeHash]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ALT+R: Refresh
            if (e.altKey && e.key === 'r') {
                e.preventDefault();
                refreshRoutes(false);
            }
            // ALT+S: Settings (Flip)
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                setIsFlipped(prev => !prev);
            }
            // ESC: Close Settings if open
            if (e.key === 'Escape' && isFlipped) {
                e.preventDefault();
                setIsFlipped(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, refreshRoutes]);

    // Transaction Status Tracking
    const { status, subStatusMsg, txLink, error: statusError, startTracking, stopTracking, resetStatus } = useTransactionStatus();
    
    // ✅ SYNC: Use enhanced monitoring state if available
    const effectiveStatus = monitoringState?.isMonitoring ? monitoringState.status : status;
    const effectiveError = monitoringState?.error || statusError;

    const [slippageWarning, setSlippageWarning] = useState(null);

    const handleSlippageChange = (value) => {
        const validation = validateSlippage(value);
        if (!validation.valid && validation.level === 'error') {
            return; // Block invalid input but allow warnings
        }
        
        setSlippageWarning(validation.message);
        
        setCustomSlippage(value);
        setSlippage(parseFloat(value) / 100);
    };

    // Real Auto Slippage Calculation based on route data
    const calculateAutoSlippage = useCallback(() => {
        if (!selectedRoute) return 0.5; // Default fallback

        // 1. Get price impact from route (this is already a percentage like 0.5 = 0.5%)
        const priceImpact = parseFloat(selectedRoute.priceImpact || 0);
        
        // 2. Add complexity buffer based on number of steps
        const stepCount = selectedRoute.steps?.length || 1;
        const complexityBuffer = stepCount > 2 ? 0.3 : (stepCount > 1 ? 0.15 : 0.05);
        
        // 3. Check if cross-chain (add extra buffer for bridge volatility)
        const isCrossChain = selectedRoute.fromChainId !== selectedRoute.toChainId;
        const bridgeBuffer = isCrossChain ? 0.2 : 0;
        
        // 4. Calculate recommended slippage
        const recommended = Math.max(
            0.1, // Minimum 0.1%
            Math.min(
                priceImpact + complexityBuffer + bridgeBuffer,
                3.0 // Maximum 3% (cap to prevent excessive slippage)
            )
        );

        // Round to 1 decimal place
        return Math.round(recommended * 10) / 10;
    }, [selectedRoute]);

    // Auto Slippage Effect - runs when route changes
    useEffect(() => {
        if (!useAutoSlippage) return;
        
        const autoValue = calculateAutoSlippage();
        setSlippage(autoValue / 100); // Convert percentage to decimal (0.5% -> 0.005)
        setCustomSlippage(autoValue.toFixed(1));
        
        logger.log('🎯 Auto-slippage calculated:', autoValue, '%', 
            selectedRoute ? `(Impact: ${selectedRoute.priceImpact}%, Steps: ${selectedRoute.steps?.length})` : '');
    }, [useAutoSlippage, selectedRoute, calculateAutoSlippage, setSlippage]);

    /**
     * ✅ Validates and switches to correct chain before swap
     */
    const ensureCorrectChain = async (requiredChainId) => {
      if (currentChainId === requiredChainId) {
        return true; // Already on correct chain
      }
      
      try {
        logger.log(`⚠️ Wrong network: on ${currentChainId}, need ${requiredChainId}`);
        
        // Prompt user to switch
        await switchChainAsync({ chainId: requiredChainId });
        
        // Wait for switch to complete
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify switch was successful (optional as switchChainAsync throws if failed usually)
        // But getting fresh chainId is good.
        // We rely on useChainId hook update or logic flow.
        return true;
        
      } catch (error) {
        logger.error('Chain switch error:', error);
        
        setExecutionError({
          title: 'Wrong Network',
          message: `Please switch to ${fromChain.name} in your wallet to continue this swap.`,
          recoverable: true,
        });
        
        return false;
      }
    };

    // Issue #9: Comprehensive pre-transaction validation
    const handleConfirmSwap = async () => {
        setShowReviewModal(false);
        if (!selectedRoute) {
            setExecutionError({
                title: 'No Route Selected',
                message: 'Please select a swap route first',
                recoverable: true,
            });
            return;
        }

        // Enhanced Route Validation
        const routeValidation = validateRoute(selectedRoute);
        if (!routeValidation.valid) {
             setExecutionError({
                title: 'Invalid Route',
                message: routeValidation.error,
                recoverable: true,
            });
            return;
        }

        // Enhanced Amount Validation
        const amountValidation = validateAmount(fromAmount, fromToken?.decimals);
        if (!amountValidation.valid) {
            setExecutionError({
                title: 'Invalid Amount',
                message: amountValidation.error,
                recoverable: true,
            });
            return;
        }

        // ✅ CRITICAL FIX: Custom Address Validation
        if (customToAddress && !isValidAddress(customToAddress)) {
            setExecutionError({
                title: 'Invalid Recipient',
                message: 'Please enter a valid wallet address (0x...)',
                recoverable: true,
            });
            return;
        }

        if (!hasSufficientBalance) {
            setExecutionError({
                title: 'Insufficient Balance',
                message: 'You don\'t have enough tokens for this swap',
                recoverable: true,
            });
            return;
        }

        try {
            setIsExecuting(true);
            setExecutionError(null);
            setCompletedTxHash(null);

            // ✅ CRITICAL: Validate chain BEFORE any transactions
            const chainValid = await ensureCorrectChain(fromChain.id);
            if (!chainValid) {
                setIsExecuting(false);
                return; // User refused to switch or switch failed
            }

            // Re-check balance after chain switch
            await checkBalance();
            // Note: checkBalance is async but updates state. 
            // We can't easily check hasSufficientBalance immediately here as it's state-based.
            // But executeSwap does its own checkBalance.

            // Now safe to execute
            const result = await executeSwap({
                selectedRoute,
                fromToken,
                toToken,
                fromAmount,
                hasSufficientBalance, // Note: this might be stale if balance changed this second, but safe enough
                checkBalance,
            });
            if (result?.hash) {
                setCompletedTxHash(result.hash);
                // Also update manual hash for tracking
                setManualHash(result.hash);
            }

        } catch (error) {
            logger.error('Swap error:', error);
            
            // Safely format error message to prevent rendering crashes
            let errorMessage = 'An unexpected error occurred';
            if (error?.message) {
                errorMessage = typeof error.message === 'object' 
                    ? JSON.stringify(error.message) 
                    : String(error.message);
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                 errorMessage = String(error);
            }

            setExecutionError({
                title: 'Swap Failed',
                message: errorMessage,
                recoverable: true,
            });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleSwap = () => {
        // 1. Basic Validation
        if (!selectedRoute) return;
        
        const amountValidation = validateAmount(fromAmount, fromToken?.decimals);
        if (!amountValidation.valid) {
             setExecutionError({ title: 'Invalid Amount', message: amountValidation.error, recoverable: true });
             return;
        }

        if (customToAddress && !isValidAddress(customToAddress)) {
             setExecutionError({ title: 'Invalid Recipient', message: 'Please enter a valid wallet address', recoverable: true });
             return;
        }

        if (!hasSufficientBalance) {
             setExecutionError({ title: 'Insufficient Balance', message: 'Insufficient balance for swap', recoverable: true });
             return;
        }

        // 2. Open Review Modal
        setShowReviewModal(true);
    };
    
    const isExecuting = isSending || isConfirming || ((effectiveStatus || 'IDLE') !== 'IDLE' && effectiveStatus !== 'DONE' && effectiveStatus !== 'FAILED');
    const isShowingStatus = isSending || isConfirming || ((effectiveStatus || 'IDLE') !== 'IDLE') || completedTxHash;

    // Sync execution state to hook to prevent auto-refresh during transactions (Issue #1 fix)
    useEffect(() => {
        setIsExecuting(isExecuting);
    }, [isExecuting, setIsExecuting]);

    // Watch for Transaction Hash to save to history
    useEffect(() => {
        const hashToTrack = activeHash;
        if (hashToTrack && selectedRoute && effectiveStatus === 'IDLE') {
            logger.log('🚀 Transaction detected, saving to history:', hashToTrack);
            
            // Save to history
            saveSwap({
                id: hashToTrack,
                fromToken,
                toToken,
                fromAmount,
                toAmount: selectedRoute?.outputAmountFormatted,
                fromChain,
                toChain,
                status: 'pending',
                provider: selectedRoute?.provider,
                explorerUrl: getExplorerUrl(fromChain.id, hashToTrack),
                inputUSD: selectedRoute?.inputUSD,
                outputUSD: selectedRoute?.outputUSD
            });
        }
    }, [activeHash, selectedRoute, fromChain, toChain, effectiveStatus, saveSwap, fromToken, toToken, fromAmount, getExplorerUrl]);

    // Update history when transaction completes or fails
    useEffect(() => {
        if (activeHash && (status === 'DONE' || status === 'FAILED')) {
            updateStatus(activeHash, status === 'DONE' ? 'completed' : 'failed');
        }
    }, [activeHash, status, updateStatus]);
    // Calculate Value Difference (Input USD vs Output USD)
    const inputValUSD = selectedRoute?.inputUSD 
        ? parseFloat(selectedRoute.inputUSD) 
        : (parseFloat(fromAmount || '0') * parseFloat(fromToken?.priceUSD || '0'));

    const outputValUSD = selectedRoute?.outputUSD 
        ? parseFloat(selectedRoute.outputUSD) 
        : (selectedRoute?.toAmount 
            ? (parseFloat(selectedRoute.toAmount) / (10 ** (toToken?.decimals || selectedRoute?.action?.toToken?.decimals || 18))) * parseFloat(toToken?.priceUSD || '0')
            : 0);

    const valueDiff = outputValUSD - inputValUSD;
    const valueDiffPct = (inputValUSD > 0) ? (valueDiff / inputValUSD) * 100 : 0;

    // Auto Slippage Logic
    useEffect(() => {
        if (useAutoSlippage) {
            // Use validator to get smart slippage based on route volatility
            const recommended = getRecommendedSlippage(selectedRoute);
            setSlippage(recommended / 100);
        } else {
            const val = parseFloat(customSlippage);
            if (!isNaN(val)) {
                setSlippage(val / 100);
            }
        }
    }, [useAutoSlippage, customSlippage, selectedRoute, setSlippage]);

    // Terms of Service Logic
    useEffect(() => {
        const accepted = localStorage.getItem('terms_accepted');
        if (accepted === 'true') {
            setAcceptedTerms(true);
        }
    }, []);

    const handleAcceptTerms = () => {
        localStorage.setItem('terms_accepted', 'true');
        setAcceptedTerms(true);
    };

    return (
        <div className="swap-card-wrapper">
            {!acceptedTerms && <TermsModal onAccept={handleAcceptTerms} />}
            
            <RateLimitWarning />
            
            {/* We keep the glowing wrapper OUTSIDE the flip so the glow is constant */}
            <GlowingCard>
                <div className={`card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
                    
                    {/* ========== FRONT FACE (SWAP UI) ========== */}
                    <div className="card-face front">
                        <div className="swap-card-inner">
                            {/* Header */}
                            <div className="swap-header">
                                <div className="swap-title">
                                    <span className="gradient-text">Swap</span>
                                    <span className="pro-badge">AGGREGATOR</span>
                                </div>
                                <div className="header-controls">
                                    <button 
                                        className="icon-button" 
                                        onClick={() => setShowHistory(true)}
                                        title="Transaction History"
                                    >
                                        <History size={20} />
                                    </button>
                                    <div 
                                        className="refresh-timer"
                                        onClick={() => setAutoRefresh(!autoRefresh)}
                                        style={{ 
                                            borderColor: autoRefresh ? 'var(--primary)' : '#444',
                                            color: autoRefresh ? 'var(--primary)' : '#666',
                                            background: autoRefresh ? 'rgba(255, 113, 32, 0.1)' : 'transparent'
                                        }}
                                    >
                                        {timeLeft}
                                    </div>
                                    <button className="icon-button" onClick={() => refreshRoutes(false)} disabled={loading}>
                                        <RefreshCw size={20} className={loading || isRefreshing ? "spin" : ""} />
                                    </button>
                                    <button className="icon-button" onClick={() => setIsFlipped(true)}>
                                        <Settings size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* ========== MAIN CONTENT AREA ========== */}
                                    {/* From Input */}
                                    <div className="input-container">
                                        {/* Gas Indicator */}
                                        <div style={{position:'absolute', top:'-24px', right:'0', fontSize:'0.75rem', color:'#888', display:'flex', alignItems:'center', gap:'4px'}}>
                                            <Activity size={12} />
                                            <span>Gas: {gasPrice?.standard ? (gasPrice.standard / 1e9).toFixed(1) : '...'} Gwei</span>
                                        </div>
                                        <div className="input-label-row">
                                            <span>You pay</span>
                                            <span>Balance: {loadingBalance ? '...' : (balance?.formatted ? parseFloat(balance.formatted).toFixed(6) : '0.0')}</span>
                                        </div>
                                        <div className="input-main-row">
                                            <input 
                                                className="amount-input" 
                                                placeholder="0" 
                                                value={fromAmount}
                                                onChange={(e) => {
                                                    if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                                                        setFromAmount(e.target.value);
                                                        if (executionError) setExecutionError(null); // Clear error on type
                                                    }
                                                }}
                                            />
                                            <ChainTokenSelector 
                                                selectedChain={fromChain}
                                                selectedToken={fromToken}
                                                onChainSelect={(c) => { setFromChain(c); setFromToken(null); }}
                                                onTokenSelect={setFromToken}
                                                label="From"
                                            />
                                        </div>
                                        <div className="input-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                            <div className="usd-value">
                                                ≈ ${inputValUSD.toFixed(2)}
                                            </div>
                                            {!hasSufficientBalance && (
                                                <div style={{ color: 'var(--error)', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    Insufficient Balance
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Switcher */}
                                    <div className="switch-button-container">
                                        <button className="switch-button" onClick={switchTokens}>
                                            <ArrowDown size={20} />
                                        </button>
                                    </div>

                                    {/* To Input */}
                                    <div className="input-container">
                                        <div className="input-label-row">
                                            <span>You receive</span>
                                            {selectedRoute?.isBest && <span className="provider-badge"><CheckCircle size={12}/> Best Rate</span>}
                                        </div>
                                        <div className="input-main-row">
                                            {loading ? (
                                                <div style={{ flex: 1, padding: '12px 0' }}>
                                                    <Skeleton height="32px" width="60%" borderRadius="8px" />
                                                </div>
                                            ) : (
                                                <input 
                                                    className="amount-input" 
                                                    placeholder="0" 
                                                    readOnly
                                                    value={selectedRoute?.outputAmountFormatted || '0.0'}
                                                    style={{ color: 'var(--success)' }}
                                                />
                                            )}
                                            <ChainTokenSelector 
                                                selectedChain={toChain}
                                                selectedToken={toToken}
                                                onChainSelect={(c) => { setToChain(c); setToToken(null); }}
                                                onTokenSelect={setToToken}
                                            />
                                        </div>
                                        <div className="input-footer" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '8px' }}>
                                            <div className="usd-value">
                                                {loading ? <Skeleton height="14px" width="80px" borderRadius="4px" /> : `≈ $${outputValUSD.toFixed(2)}`}
                                            </div>
                                        </div>
                                    </div>


                            {/* NON-EVM RECIPIENT ADDRESS INPUT */}
                            {toChain?.id > LARGE_CHAIN_ID_THRESHOLD && (
                                <div className="recipient-section" style={{ marginTop: '12px' }}>
                                    <div className="input-header" style={{ marginBottom: '6px' }}>
                                        <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)' }}>
                                            <Wallet size={14} /> Recipient {toChain?.name || 'Chain'} Address
                                        </span>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder={`Enter ${toChain?.name || 'recipient'} address...`} 
                                        className="recipient-input"
                                        value={customToAddress}
                                        onChange={(e) => setCustomToAddress(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            background: 'rgba(0, 0, 0, 0.2)',
                                            border: customToAddress && !isValidAddress(customToAddress)
                                                ? '1px solid #ff6b6b' 
                                                : '1px solid rgba(255, 255, 255, 0.1)',
                                            color: 'white',
                                            fontFamily: 'var(--font-mono)',
                                            outline: 'none',
                                            fontSize: '14px'
                                        }}
                                    />
                                    {customToAddress && !isValidAddress(customToAddress) && (
                                        <div style={{ fontSize: '11px', color: '#ff6b6b', marginTop: '4px' }}>
                                            Please enter a valid address (0x...)
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Route Visualization */}
                            <AnimatePresence>
                                {selectedRoute && (!loading || isShowingStatus) && (
                                    <motion.div 
                                        variants={fadeInUp}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="route-info-card"
                                    >
                                        <div className="route-header-row" onClick={() => setShowRouteDetails(!showRouteDetails)} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {isShowingStatus ? (
                                                    status === 'DONE' ? <CheckCircle size={16} color="var(--success)"/> : <RefreshCw size={16} className="spin" color="var(--primary)"/>
                                                ) : (
                                                    <Activity size={16} color="var(--primary)" />
                                                )}
                                                <span style={{ fontWeight: 600 }}>
                                                    {isShowingStatus ? (status === 'DONE' ? 'Swap Completed!' : (subStatusMsg || 'Transaction In Progress')) : 'Route Optimization'}
                                                </span>
                                                <button 
                                                    style={{marginLeft:'auto', background:'rgba(255,255,255,0.1)', border:'none', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'4px', cursor:'pointer'}}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSettingsView('routes');
                                                        setIsFlipped(true);
                                                    }}
                                                >
                                                    COMPARE ({routes.length})
                                                </button>
                                            </div>
                                            <ChevronDown size={16} style={{ transform: showRouteDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
                                        </div>
                                        
                                        {/* Route Details Box */}
                                        <div className="route-details-box">
                                            <div className="detail-row">
                                                <span className="detail-label">Route</span>
                                                <span className="detail-value">{selectedRoute.provider}</span>
                                            </div>

                                            {/* Used Protocols (Bridges/Exchanges) - BADGES */}
                                            {selectedRoute.steps && (() => {
                                                const protocols = [...new Set(selectedRoute.steps.map(s => s.toolDetails?.name || s.tool))];
                                                const uniqueProtocols = protocols.filter(p => p && p.toLowerCase() !== selectedRoute.provider?.toLowerCase());
                                                if (uniqueProtocols.length === 0) return null;
                                                return (
                                                    <div className="detail-row" style={{ alignItems: 'flex-start' }}>
                                                        <span className="detail-label" style={{ marginTop: '4px' }}>Via</span>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end', flex: 1 }}>
                                                            {uniqueProtocols.map((protocol, idx) => (
                                                                <div key={idx} style={{
                                                                    background: 'rgba(255, 113, 32, 0.15)',
                                                                    border: '1px solid rgba(255, 113, 32, 0.3)',
                                                                    borderRadius: '6px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.75rem', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                                                                }}>
                                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff7120' }} />
                                                                    {protocol}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            <div className="detail-row">
                                                <Tooltip content="Estimated cost to process this transaction on the blockchain.">
                                                    <span className="detail-label" style={{ borderBottom: '1px dashed #666', cursor: 'help' }}>Network Cost</span>
                                                </Tooltip>
                                                <span className="detail-value" style={{ color: '#FF7120' }}>${selectedRoute.gasUSD || '0.00'}</span>
                                            </div>


                                            {/* Detailed Fees Breakdown */}
                                            {/* Consolidated Provider Fees */}
                                            {(() => {
                                                const fees = selectedRoute.fees || [];
                                                const totalFees = fees.reduce((acc, fee) => acc + parseFloat(fee.amountUSD || 0), 0);
                                                
                                                // Calculate Price Impact = (TotalValueDiff) - (All Explicit Fees)
                                                // ValueDiff is usually negative (loss). We want the absolute "loss" part.
                                                // Impact = |ValueDiff| - (NetworkCost + ProviderFees)
                                                const absLoss = Math.abs(valueDiff);
                                                // Fixed: Gas (Network Cost) is paid separately and is NOT part of ValueDiff (Token Loss).
                                                // Only Provider Fees are deducted from the token amount and thus explain part of ValueDiff.
                                                // Price Impact (Slippage) = |ValueDiff| - ProviderFees
                                                // Price Impact (Slippage) = |ValueDiff| - ProviderFees
                                                const totalExplicitCosts = totalFees; 
                                                // If Fees > Loss, then Impact is negative (Gain/Improvement).
                                                // We do NOT clamp to 0 anymore.
                                                const rawImpact = absLoss - totalExplicitCosts;
                                                const isGain = rawImpact < 0;
                                                const displayImpact = Math.abs(rawImpact);

                                                return (
                                                    <>
                                                        {/* Provider Fees (Grouped) */}
                                                        <div className="detail-row" style={{ padding: '2px 0' }}>
                                                            <Tooltip content={
                                                                <div>
                                                                    <div style={{fontWeight:'bold', marginBottom:'4px'}}>Fee Breakdown:</div>
                                                                    {fees.map((f, i) => (
                                                                        <div key={i}>{f.name === 'LIFI Fixed Fee' ? 'Bridge Fee' : f.name}: ${parseFloat(f.amountUSD).toFixed(3)}</div>
                                                                    ))}
                                                                    {fees.length === 0 && <div>No provider fees</div>}
                                                                </div>
                                                            }>
                                                                <span className="detail-label" style={{ borderBottom: '1px dashed #666', cursor: 'help' }}>Provider Fees</span>
                                                            </Tooltip>
                                                            <span className="detail-value" style={{ color: '#FFC107' }}>
                                                                ${totalFees.toFixed(3)}
                                                            </span>
                                                        </div>

                                                        {/* Price Impact (Slippage) */}
                                                        <div className="detail-row" style={{ padding: '2px 0' }}>
                                                            <Tooltip content="Value lost (or gained) due to market mechanics.">
                                                                <span className="detail-label" style={{ borderBottom: '1px dashed #666', cursor: 'help' }}>Price Impact</span>
                                                            </Tooltip>
                                                            <span className="detail-value" style={{ color: isGain ? 'var(--success)' : '#ff6b6b' }}>
                                                                {isGain ? '+' : '-'}${displayImpact.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </>
                                                );
                                            })()}

                                            <div className="detail-row" style={{ padding: '2px 0' }}>
                                                <Tooltip content="Difference between input value and estimated output value (slippage + fees).">
                                                    <span className="detail-label" style={{ borderBottom: '1px dashed #666', cursor: 'help' }}>Value Difference</span>
                                                </Tooltip>
                                                <span className="detail-value" style={{ color: valueDiff >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                                    {valueDiff >= 0 ? '+' : ''}{valueDiff.toFixed(2)}$
                                                    <span style={{color: '#888', marginLeft: '4px', fontSize: '0.75rem'}}>
                                                        ({valueDiffPct > 0 ? '+' : ''}{valueDiffPct.toFixed(2)}%)
                                                    </span>
                                                </span>
                                            </div>

                                            {/* Enhanced Route Flow */}
                                            {(showRouteDetails || isShowingStatus) && selectedRoute.steps && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                                                >
                                                    {/* Timeline Header */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6200EA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                                <Activity size={20} />
                                                            </div>
                                                            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#222', borderRadius: '50%', padding: '2px', border:'1px solid #333' }}>
                                                                <div style={{ width: '16px', height: '16px', background: '#FF7120', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <ArrowRight size={10} color="white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>
                                                            {selectedRoute.provider} via LI.FI
                                                        </div>
                                                    </div>

                                                    <div className="route-flow" style={{ position: 'relative', paddingLeft: '20px' }}>
                                                        {selectedRoute.steps.flatMap(s => s.includedSteps && s.includedSteps.length > 0 ? s.includedSteps : [s]).map((step, i, arr) => {
                                                            const isSameChain = step.action.fromChainId === step.action.toChainId;
                                                            
                                                            // LOGIC: Determine Step Type
                                                            const isFee = step.tool.toLowerCase().includes('fee') || step.type === 'fee' || step.toolDetails?.name?.toLowerCase().includes('fee');
                                                            const isSwap = !isFee && (isSameChain || step.type === 'swap' || step.tool.toLowerCase().includes('swap') || step.tool.toLowerCase().includes('dex') || step.tool.toLowerCase().includes('1inch') || step.tool.toLowerCase().includes('paraswap'));
                                                            
                                                            // Cross-Chain Logic
                                                            const isCrossChainSwap = !isSameChain && step.action.fromToken.symbol !== step.action.toToken.symbol;

                                                            // HELPER: Resolve Chain Name efficiently
                                                            const getChainName = (cId) => {
                                                                if (cId === fromChain?.id) return fromChain.name;
                                                                if (cId === toChain?.id) return toChain.name;
                                                                if (cId === 1) return 'Ethereum';
                                                                if (cId === 137) return 'Polygon';
                                                                if (cId === 56) return 'BNB Chain';
                                                                if (cId === 42161) return 'Arbitrum';
                                                                if (cId === 10) return 'Optimism';
                                                                if (cId === 8453) return 'Base';
                                                                if (cId === 43114) return 'Avalanche';
                                                                if (cId === 33139) return 'ApeChain';
                                                                if (cId === 1151111081099710) return 'Solana';
                                                                return 'Chain ' + cId;
                                                            };
                                                            
                                                            return (
                                                                <div key={i} className="flow-step" style={{ display: 'flex', flexDirection: 'column', position: 'relative', marginBottom: i < arr.length - 1 ? '4px' : '0' }}>
                                                                    {/* Vertical Line */}
                                                                    {i < arr.length - 1 && (
                                                                        <div style={{ position: 'absolute', left: '16px', top: '32px', bottom: '-4px', width: '2px', background: '#444' }} />
                                                                    )}
                                                                    
                                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', zIndex: 1 }}>
                                                                        {/* Step Icon */}
                                                                        <div style={{ position: 'relative' }}>
                                                                            <div style={{ 
                                                                                width: '36px', height: '36px', 
                                                                                borderRadius: '50%', 
                                                                                background: '#1a1b26', 
                                                                                border: '2px solid #333',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                zIndex: 2
                                                                            }}>
                                                                                 {step.toolDetails?.logoURI ? (
                                                                                     <img src={step.toolDetails?.logoURI} alt="" style={{width: 20, height: 20, borderRadius:'50%'}} />
                                                                                 ) : (
                                                                                     isFee ? <DollarSign size={16} color="#aaa" /> :
                                                                                     isSwap ? <RefreshCw size={16} color="#aaa" /> : <ArrowRight size={16} color="#aaa" />
                                                                                 )}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Description */}
                                                                        <div style={{ flex: 1, paddingTop:'0px' }}>
                                                                            <div style={{ fontSize: '0.90rem', color: '#ddd', marginBottom: '2px', lineHeight: '1.3' }}>
                                                                                {isFee ? (
                                                                                    <span>Pay Fee via <span style={{color:'white', fontWeight:600}}>{step.toolDetails?.name.replace(' Fee', '') || 'Integrator'}</span></span>
                                                                                ) : isSwap ? (
                                                                                    <span>Swap on <span style={{color:'white', fontWeight:600}}>{getChainName(step.action.fromChainId)}</span> via <span style={{color:'white', fontWeight:600}}>{step.toolDetails?.name || step.tool}</span></span>
                                                                                ) : (
                                                                                    <span>{isCrossChainSwap ? 'Bridge & Swap' : 'Bridge'} from <span style={{color:'white', fontWeight:600}}>{getChainName(step.action.fromChainId)}</span> to <span style={{color:'white', fontWeight:600}}>{getChainName(step.action.toChainId)}</span> via <span style={{color:'white', fontWeight:600}}>{step.toolDetails?.name || step.tool}</span></span>
                                                                                )}
                                                                            </div>
                                                                            
                                                                            <div style={{ fontSize: '0.80rem', color: '#888', display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', fontFamily:'var(--font-mono)' }}>
                                                                                {parseFloat(formatUnits(step.action.fromAmount, step.action.fromToken.decimals)).toFixed(4)} {step.action.fromToken.symbol}
                                                                                <span style={{color:'#555'}}>→</span>
                                                                                {parseFloat(formatUnits(step.estimate.toAmount, step.action.toToken.decimals)).toFixed(4)} {step.action.toToken.symbol}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        
                                                        {/* Transaction Count Hint */}
                                                        <div style={{ display:'flex', alignItems:'flex-start', gap:'16px', marginTop:'16px' }}>
                                                             <div style={{ width: '36px', display:'flex', justifyContent:'center' }}>
                                                                <Layers size={20} color="#555" />
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#666', lineHeight:'1.4', marginTop:'-2px' }}>
                                                                <div style={{fontWeight: 600, color:'#888'}}>{selectedRoute.steps.length} Transaction(s)</div>
                                                                Each step requires a signature.
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Transaction Count Hint */}
                                                        

                                                </motion.div>
                                            )}
                                        </div>
                                            <div className="net-value-row">
                                            <span style={{ fontSize: '0.9rem', color: '#ccc' }}>Net Output</span>
                                            <span className="net-value">${selectedRoute.netValue || '0.00'}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Price Impact Warning */}
                            {selectedRoute && Math.abs(valueDiffPct) > 1 && (
                                <PriceImpactWarning impact={Math.abs(valueDiffPct)} />
                            )}

                            {/* Approval Status Indicator */}
                            {fromToken && !isNativeToken && selectedRoute && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    marginBottom: '10px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    background: isApproved 
                                        ? 'rgba(76, 175, 80, 0.1)' 
                                        : needsApproval 
                                            ? 'rgba(255, 193, 7, 0.1)' 
                                            : 'rgba(255, 255, 255, 0.05)',
                                    border: `1px solid ${isApproved 
                                        ? 'rgba(76, 175, 80, 0.3)' 
                                        : needsApproval 
                                            ? 'rgba(255, 193, 7, 0.3)' 
                                            : 'rgba(255, 255, 255, 0.1)'}`,
                                    color: isApproved ? '#4CAF50' : needsApproval ? '#FFC107' : '#888'
                                }}>
                                    {isCheckingApproval ? (
                                        <><RefreshCw size={14} className="spin" /> Checking approval...</>
                                    ) : isApprovalPending ? (
                                        <><RefreshCw size={14} className="spin" /> Approving {fromToken?.symbol}...</>
                                    ) : isApproved ? (
                                        <><Unlock size={14} /> {fromToken?.symbol} approved</>
                                    ) : needsApproval ? (
                                        <><Lock size={14} /> {fromToken?.symbol} requires approval</>
                                    ) : null}
                                </div>
                            )}


                            {/* Swap/Approve Button */}
                            {needsApproval && !isApproved && selectedRoute && (
                                <div style={{marginBottom: '8px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.75rem', color:'#aaa', justifyContent:'center'}}>
                                    <input 
                                        type="checkbox" 
                                        checked={useInfiniteApproval}
                                        onChange={(e) => setUseInfiniteApproval(e.target.checked)}
                                        id="inf-approval"
                                        style={{cursor:'pointer'}}
                                    />
                                    <label htmlFor="inf-approval" style={{cursor:'pointer'}}>Enable Infinite Approval (Save Gas)</label>
                                </div>
                            )}

                            {needsApproval && !isApproved && selectedRoute ? (
                                <button 
                                    className="swap-button approve-button"
                                    disabled={!isConnected || isApprovalPending || isCheckingApproval}
                                    onClick={() => handleApprove(useInfiniteApproval)} 
                                    style={{
                                        background: 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)',
                                        boxShadow: '0 4px 20px rgba(255, 193, 7, 0.3)'
                                    }}
                                >
                                    {isApprovalPending ? (
                                        <><RefreshCw className="spin" /> Approving...</>
                                    ) : isCheckingApproval ? (
                                        <><RefreshCw className="spin" /> Checking...</>
                                    ) : (
                                        <><Lock size={18} /> Approve {fromToken?.symbol}</>
                                    )}
                                </button>
                            ) : (
                                <button 
                                    className="swap-button"
                                    disabled={!isConnected || loading || isExecuting || !hasSufficientBalance || !selectedRoute || (needsApproval && !isApproved)}
                                    onClick={handleSwap}
                                >
                                    {loading ? <RefreshCw className="spin" /> : 
                                     isExecuting ? <RefreshCw className="spin" /> :
                                     !isConnected ? "Connect Wallet" :
                                     !hasSufficientBalance ? "Insufficient Balance" :
                                     "SWAP NOW"}
                                </button>
                            )}

                             {/* Active Features */}
                             <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>

                                {gasSpeed === 'fast' && <div className="feature-badge feature-gas">⚡ Fast Gas</div>}
                            </div>
                            {/* Errors */}
                            {(error || executionError || approvalError || (statusError && status !== 'DONE')) && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    style={{ background: 'rgba(255, 82, 82, 0.1)', border: '1px solid var(--error)', padding: '10px', borderRadius: '8px', marginTop: '10px', display: 'flex', flexDirection:'column', gap: '8px', color: 'var(--error)', fontSize: '0.85rem' }}
                                >
                                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                        <AlertCircle size={16} />
                                        <span>{executionError?.message || approvalError || error?.message || (typeof statusError === 'object' ? statusError?.message : statusError)}</span>
                                    </div>
                                    
                                    {/* Retry Action */}
                                    {(executionError?.recoverable || error) && (
                                        <button 
                                            onClick={() => {
                                                setExecutionError(null);
                                                refreshRoutes(true);
                                            }}
                                            style={{
                                                alignSelf: 'flex-end',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                color: 'white',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <RotateCcw size={12} /> Retry
                                        </button>
                                    )}
                                </motion.div>
                            )}

                        </div>
                    </div>


                    {/* ========== BACK FACE (SETTINGS UI) ========== */}
                    <div className="card-face back">
                        <div className="swap-card-inner">
                            {/* Settings Header */}
                            <div className="settings-header">
                                <button className="settings-back-btn" onClick={() => {
                                    if (settingsView === 'main') setIsFlipped(false);
                                    else setSettingsView('main');
                                }}>
                                    <ArrowLeft size={24} />
                                </button>
                                <div className="settings-title">
                                    {settingsView === 'main' ? 'Settings' : 
                                     settingsView === 'routes' ? 'Compare Routes' :
                                     settingsView === 'bridges' ? 'Bridges' : 'Exchanges'}
                                </div>
                            </div>

                            {/* MAIN SETTINGS VIEW */}
                            {settingsView === 'main' && (
                                <div className="settings-list">
                                    {/* 1. Route Priority */}
                                    <div className="settings-item">
                                        <div className="settings-label">
                                            <GitMerge size={18} /> Route priority
                                        </div>
                                        <div className="settings-control" style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setRoutePriority(p => p === 'return' ? 'gas' : 'return')}>
                                            {routePriority === 'return' ? 'Better return' : 'Lowest Gas'}
                                        </div>
                                    </div>

                                    {/* 2. Gas Price */}
                                    <div className="settings-item">
                                        <div className="settings-label">
                                            <Zap size={18} /> Gas price
                                        </div>
                                        <div className="settings-control" style={{ cursor: 'pointer', display: 'flex', gap: '4px' }}>
                                            {['standard', 'fast'].map(s => (
                                                <span 
                                                    key={s} 
                                                    onClick={() => setGasSpeed(s)}
                                                    style={{ 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px', 
                                                        background: gasSpeed === s ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                                                        opacity: gasSpeed === s ? 1 : 0.5 
                                                    }}
                                                >
                                                    {s === 'standard' ? 'Normal' : 'Fast'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Max Slippage */}
                                    <div className="settings-item">
                                        <div className="settings-label" style={{display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'2px'}}>
                                            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                                                <Percent size={18} /> Max. slippage
                                            </div>
                                            <MEVStatus slippage={slippage} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button 
                                                onClick={() => setUseAutoSlippage(!useAutoSlippage)}
                                                style={{ background: 'none', border: 'none', color: useAutoSlippage ? 'var(--primary)' : '#666', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Auto
                                            </button>
                                            {!useAutoSlippage && (
                                                <input 
                                                    type="number" 
                                                    value={customSlippage} 
                                                    onChange={(e) => handleSlippageChange(e.target.value)}
                                                    style={{ width: '50px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', textAlign: 'center' }} 
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {slippageWarning && (
                                        <div style={{fontSize:'0.75rem', color:'#ff9800', padding:'0 12px 8px 12px', marginTop:'-8px'}}>
                                            {slippageWarning}
                                        </div>
                                    )}
                                    
                                    {/* 4. Bridges */}
                                    <div className="settings-item" onClick={() => setSettingsView('bridges')} style={{ cursor: 'pointer' }}>
                                        <div className="settings-label">
                                            <Layers size={18} /> Bridges
                                        </div>
                                        <div className="settings-control">
                                            {availableBridges.length - disabledBridges.length}/{availableBridges.length}
                                        </div>
                                    </div>

                                    {/* 5. Exchanges */}
                                    <div className="settings-item" onClick={() => setSettingsView('exchanges')} style={{ cursor: 'pointer' }}>
                                        <div className="settings-label">
                                            <RefreshCw size={18} /> Exchange platforms
                                        </div>
                                        <div className="settings-control">
                                            {availableExchanges.length - disabledExchanges.length}/{availableExchanges.length}
                                        </div>
                                    </div>


                                </div>
                            )}

                            {/* BRIDGES / EXCHANGES / ROUTES SUB-VIEWS */}
                            {(settingsView === 'bridges' || settingsView === 'exchanges' || settingsView === 'routes') && (
                                <div className="tools-subview">
                                    
                                    {/* Subview Header */}
                                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{color:'#888', fontSize:'0.9rem'}}>
                                            {settingsView === 'routes' ? `Found ${routes.length} routes` : 'Select providers'}
                                        </span>
                                    </div>
                                    
                                    {/* Routes List */}
                                    {settingsView === 'routes' && (
                                        <div className="routes-list">
                                            {routes.map((route, i) => {
                                                const isSelected = selectedRoute?.id === route.id;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className="route-item" 
                                                        onClick={() => {
                                                            setSelectedRoute(route);
                                                            setIsFlipped(false);
                                                            setSettingsView('main');
                                                        }}
                                                        style={{
                                                            background: isSelected ? 'rgba(255, 113, 32, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                            border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '12px',
                                                            padding: '12px',
                                                            cursor: 'pointer',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {i === 0 && <div style={{position:'absolute', top:'-8px', right:'12px', background:'var(--primary)', fontSize:'10px', padding:'2px 6px', borderRadius:'4px', color:'white', fontWeight:'bold'}}>BEST</div>}
                                                        
                                                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                                                            <span style={{fontWeight:600}}>{route.provider}</span>
                                                            <span style={{fontWeight:600}}>${parseFloat(route.toAmountUSD || 0).toFixed(2)}</span>
                                                        </div>
                                                        
                                                        <div style={{display:'flex', gap:'12px', fontSize:'0.8rem', color:'#aaa'}}>
                                                            <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                                                <Zap size={12}/> ${route.gasCostUSD || '0.00'}
                                                            </div>
                                                            <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                                                <Layers size={12}/> {route.steps.length} Steps
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Search Bar (Only for Bridges/Exchanges) */}
                                    {settingsView !== 'routes' && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <input 
                                            placeholder={`Search by ${settingsView === 'bridges' ? 'bridge' : 'exchange'} name`}
                                            className="search-input"
                                            value={toolSearch}
                                            onChange={(e) => setToolSearch(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                background: 'rgba(0, 0, 0, 0.2)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                fontFamily: 'var(--font-body)',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    )}

                                    {/* List (Bridges/Exchanges) */}
                                    {settingsView !== 'routes' && (
                                    <div className="tools-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                        {(settingsView === 'bridges' ? availableBridges : availableExchanges)
                                            .filter(tool => tool.name.toLowerCase().includes(toolSearch.toLowerCase()))
                                            .map(tool => {
                                                const isDisabled = settingsView === 'bridges' 
                                                    ? disabledBridges.includes(tool.key) 
                                                    : disabledExchanges.includes(tool.key);
                                                
                                                return (
                                                    <div key={tool.key} className="settings-item" style={{ marginBottom: '8px', padding: '12px' }} 
                                                        onClick={() => {
                                                            if (settingsView === 'bridges') {
                                                                setDisabledBridges(prev => 
                                                                    prev.includes(tool.key) ? prev.filter(k => k !== tool.key) : [...prev, tool.key]
                                                                );
                                                            } else {
                                                                setDisabledExchanges(prev => 
                                                                    prev.includes(tool.key) ? prev.filter(k => k !== tool.key) : [...prev, tool.key]
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            {tool.logoURI ? (
                                                                <img src={tool.logoURI} alt={tool.name} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                                            ) : (
                                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#333' }} />
                                                            )}
                                                            <span style={{ fontWeight: 500, color: 'white' }}>{tool.name}</span>
                                                        </div>
                                                        <div style={{ 
                                                            width: 20, height: 20, 
                                                            borderRadius: 4, 
                                                            border: '2px solid',
                                                            borderColor: isDisabled ? '#666' : 'var(--primary)',
                                                            background: isDisabled ? 'transparent' : 'var(--primary)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            {!isDisabled && <CheckCircle size={14} color="white" />}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                    )}
                                </div>
                            )}
                        </div>
    
                </div>

            </div>
            </GlowingCard>

            {/* REVIEW MODAL */}
            {showReviewModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            background: '#1a1b26', width: '90%', maxWidth: '400px',
                            borderRadius: '16px', padding: '24px', border: '1px solid #333',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}
                    >
                        <h3 style={{margin: '0 0 16px', fontSize: '1.2rem'}}>Review Swap</h3>
                        
                        <div style={{background:'rgba(0,0,0,0.2)', padding:'12px', borderRadius:'12px', marginBottom:'16px'}}>
                             <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                                <span style={{color:'#888'}}>Pay</span>
                                <span style={{fontWeight:600}}>{fromAmount} {fromToken?.symbol}</span>
                             </div>
                             <div style={{display:'flex', justifyContent:'space-between'}}>
                                <span style={{color:'#888'}}>Receive</span>
                                <span style={{fontWeight:600, color:'var(--success)'}}>{selectedRoute?.outputAmountFormatted} {toToken?.symbol}</span>
                             </div>
                        </div>

                        {/* WARNINGS */}
                        {parseFloat(selectedRoute?.inputUSD || '0') > 10000 && (
                            <div style={{
                                background: 'rgba(255,193,7,0.15)', border: '1px solid #ffc107',
                                color: '#ffc107', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px',
                                display: 'flex', gap: '8px', alignItems: 'start'
                            }}>
                                <AlertTriangle size={16} />
                                <div>
                                    <strong>High Value Swap</strong><br/>
                                    Please double check all details.
                                </div>
                            </div>
                        )}

                        <div style={{display:'flex', gap:'12px', marginTop:'24px'}}>
                            <button 
                                onClick={() => setShowReviewModal(false)}
                                style={{flex:1, padding:'12px', borderRadius:'12px', background:'transparent', border:'1px solid #444', color:'white', cursor:'pointer'}}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmSwap}
                                style={{
                                    flex:1, padding:'12px', borderRadius:'12px', cursor:'pointer', border:'none',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-color) 100%)',
                                    color: 'white', fontWeight: 600
                                }}
                            >
                                Confirm Swap
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}


            {/* Swap History Modal */}
            <SwapHistory 
                walletAddress={walletAddress}
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
            />
        </div>
    );
};

export default SwapCard;
