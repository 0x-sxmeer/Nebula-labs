/**
 * SwapHistory Component
 * Displays user's transaction history with status tracking
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ExternalLink, CheckCircle, Clock, XCircle, Trash2, ArrowRight, X } from 'lucide-react';
import { useSwapHistory } from '../../hooks/useSwapHistory';
import './SwapHistory.css';

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 24 hours
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Less than 7 days
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    // Format as date
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
};

const StatusBadge = ({ status }) => {
    const config = {
        pending: { icon: Clock, color: '#FFC107', bg: 'rgba(255, 193, 7, 0.1)', text: 'Pending' },
        completed: { icon: CheckCircle, color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)', text: 'Completed' },
        failed: { icon: XCircle, color: '#FF5252', bg: 'rgba(255, 82, 82, 0.1)', text: 'Failed' }
    };
    
    const { icon: Icon, color, bg, text } = config[status] || config.pending;
    
    return (
        <div className="status-badge" style={{ background: bg, color }}>
            <Icon size={12} />
            <span>{text}</span>
        </div>
    );
};

const HistoryItem = ({ item, getExplorerUrl }) => {
    const explorerUrl = item.explorerUrl || getExplorerUrl(item.fromChain?.id, item.id);
    
    return (
        <motion.div 
            className="history-item"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            layout
        >
            <div className="history-item-header">
                <div className="history-tokens">
                    <div className="token-pair">
                        <img 
                            src={item.fromToken?.logoURI || 'https://via.placeholder.com/24'} 
                            alt={item.fromToken?.symbol}
                            className="token-icon"
                            onError={(e) => e.target.src = 'https://via.placeholder.com/24'}
                        />
                        <span className="token-amount">{parseFloat(item.fromAmount || 0).toFixed(4)}</span>
                        <span className="token-symbol">{item.fromToken?.symbol}</span>
                    </div>
                    <ArrowRight size={14} className="arrow-icon" />
                    <div className="token-pair">
                        <img 
                            src={item.toToken?.logoURI || 'https://via.placeholder.com/24'} 
                            alt={item.toToken?.symbol}
                            className="token-icon"
                            onError={(e) => e.target.src = 'https://via.placeholder.com/24'}
                        />
                        <span className="token-amount">{parseFloat(item.toAmount || 0).toFixed(4)}</span>
                        <span className="token-symbol">{item.toToken?.symbol}</span>
                    </div>
                </div>
                <StatusBadge status={item.status} />
            </div>
            
            <div className="history-item-footer">
                <div className="chain-info">
                    {item.fromChain?.name}
                    {item.fromChain?.id !== item.toChain?.id && (
                        <>
                            <ArrowRight size={10} />
                            {item.toChain?.name}
                        </>
                    )}
                </div>
                <div className="meta-info">
                    <span className="timestamp">{formatDate(item.timestamp)}</span>
                    {explorerUrl && (
                        <a 
                            href={explorerUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="explorer-link"
                            title="View on Explorer"
                        >
                            <ExternalLink size={12} />
                        </a>
                    )}
                </div>
            </div>
            
            {item.provider && (
                <div className="provider-tag">via {item.provider}</div>
            )}
        </motion.div>
    );
};

const SwapHistory = ({ walletAddress, isOpen, onClose }) => {
    const { history, isLoading, clearHistory, getExplorerUrl, isEmpty } = useSwapHistory(walletAddress);
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    const handleClearHistory = () => {
        clearHistory();
        setShowConfirmClear(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className="history-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div 
                className="history-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="history-header">
                    <div className="history-title">
                        <History size={20} />
                        <span>Transaction History</span>
                    </div>
                    <div className="history-actions">
                        {!isEmpty && !showConfirmClear && (
                            <button 
                                className="clear-btn"
                                onClick={() => setShowConfirmClear(true)}
                                title="Clear History"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button className="close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {showConfirmClear && (
                    <motion.div 
                        className="confirm-clear"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                    >
                        <span>Clear all history?</span>
                        <div className="confirm-buttons">
                            <button onClick={() => setShowConfirmClear(false)}>Cancel</button>
                            <button className="danger" onClick={handleClearHistory}>Clear</button>
                        </div>
                    </motion.div>
                )}

                <div className="history-content">
                    {isLoading ? (
                        <div className="history-loading">
                            <div className="spinner" />
                            <span>Loading history...</span>
                        </div>
                    ) : isEmpty ? (
                        <div className="history-empty">
                            <History size={48} strokeWidth={1} />
                            <h3>No transactions yet</h3>
                            <p>Your swap history will appear here</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            <AnimatePresence>
                                {history.map((item) => (
                                    <HistoryItem 
                                        key={item.id} 
                                        item={item} 
                                        getExplorerUrl={getExplorerUrl}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
                
                <div className="history-footer">
                    <span className="history-count">
                        {history.length} transaction{history.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SwapHistory;
