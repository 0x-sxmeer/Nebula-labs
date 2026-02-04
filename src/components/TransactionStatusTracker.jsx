/**
 * Transaction Status Tracker
 * Monitors cross-chain transaction status with Li.Fi status endpoint
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { lifiService } from '../services/lifiService';

/**
 * Status badge component
 */
const StatusBadge = ({ status, substatus }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'DONE':
        return {
          icon: CheckCircle,
          color: '#4CAF50',
          bg: 'rgba(76, 175, 80, 0.15)',
          label: substatus === 'COMPLETED' ? 'Completed' : 'Done',
        };
      case 'PENDING':
        return {
          icon: Clock,
          color: '#FFC107',
          bg: 'rgba(255, 193, 7, 0.15)',
          label: 'In Progress',
        };
      case 'FAILED':
        return {
          icon: AlertCircle,
          color: '#f87171',
          bg: 'rgba(248, 113, 113, 0.15)',
          label: 'Failed',
        };
      default:
        return {
          icon: Clock,
          color: '#888',
          bg: 'rgba(136, 136, 136, 0.15)',
          label: 'Unknown',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: config.bg,
      border: `1px solid ${config.color}40`,
      borderRadius: '12px',
    }}>
      <Icon size={18} color={config.color} />
      <span style={{ color: config.color, fontWeight: 600, fontSize: '0.9rem' }}>
        {config.label}
      </span>
    </div>
  );
};

/**
 * Substatus message component
 */
const SubstatusMessage = ({ substatus, substatusMessage }) => {
  const getSubstatusConfig = () => {
    switch (substatus) {
      case 'WAIT_SOURCE_CONFIRMATIONS':
        return { color: '#60A5FA', message: 'Waiting for source chain confirmations...' };
      case 'WAIT_DESTINATION_TRANSACTION':
        return { color: '#FFC107', message: 'Bridge in progress. Waiting for destination...' };
      case 'BRIDGE_NOT_AVAILABLE':
        return { color: '#f87171', message: 'Bridge temporarily unavailable' };
      case 'REFUND_IN_PROGRESS':
        return { color: '#FFC107', message: 'Refund in progress...' };
      case 'COMPLETED':
        return { color: '#4CAF50', message: 'Transfer complete!' };
      case 'PARTIAL':
        return { color: '#FFC107', message: 'Partially completed' };
      case 'REFUNDED':
        return { color: '#60A5FA', message: 'Refunded' };
      default:
        return { color: '#888', message: substatusMessage || 'Processing...' };
    }
  };

  const config = getSubstatusConfig();

  return (
    <div style={{
      fontSize: '0.85rem',
      color: config.color,
      padding: '8px 0',
      fontWeight: 500,
    }}>
      {config.message}
    </div>
  );
};

/**
 * Transaction link component
 */
const TxLink = ({ txHash, txLink, chainName, label }) => (
  <a
    href={txLink}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.08)',
      textDecoration: 'none',
      color: '#60A5FA',
      fontSize: '0.85rem',
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
      e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    }}
  >
    <span style={{ fontWeight: 600 }}>{label || chainName}:</span>
    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
      {txHash.slice(0, 6)}...{txHash.slice(-4)}
    </span>
    <ExternalLink size={14} />
  </a>
);

/**
 * Main Transaction Status Tracker
 */
const TransactionStatusTracker = ({ 
  txHash, 
  fromChainId, 
  toChainId,
  onStatusChange,
  autoRefresh = true,
}) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch transaction status
   */
  const fetchStatus = useCallback(async (showRefreshing = false) => {
    if (!txHash) return;

    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    setError(null);

    try {
      const statusData = await lifiService.getStatus({
        txHash,
        fromChain: fromChainId,
        toChain: toChainId,
      });

      setStatus(statusData);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(statusData);
      }

      // Stop auto-refresh if transaction is done or failed
      if (statusData.status === 'DONE' || statusData.status === 'FAILED') {
        return false; // Signal to stop auto-refresh
      }

      return true; // Continue auto-refresh

    } catch (err) {
      console.error('Error fetching status:', err);
      setError(err.message || 'Failed to fetch status');
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [txHash, fromChainId, toChainId, onStatusChange]);

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    if (!autoRefresh || !txHash) return;

    // Initial fetch
    fetchStatus();

    // Set up polling (every 5 seconds for pending transactions)
    const interval = setInterval(async () => {
      const shouldContinue = await fetchStatus(true);
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [txHash, autoRefresh, fetchStatus]);

  // Loading state
  if (loading && !status) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#ff7120' }} />
        <div style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
          Loading transaction status...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'rgba(248, 113, 113, 0.1)',
        borderRadius: '16px',
        border: '1px solid rgba(248, 113, 113, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <AlertCircle size={24} color="#f87171" />
          <span style={{ color: '#f87171', fontWeight: 600 }}>Error Loading Status</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
          {error}
        </div>
        <button
          onClick={() => fetchStatus()}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: 'rgba(248, 113, 113, 0.2)',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
            Transaction Status
          </div>
          <StatusBadge status={status.status} substatus={status.substatus} />
        </div>

        <button
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          style={{
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            cursor: 'pointer',
            opacity: refreshing ? 0.5 : 1,
          }}
        >
          <RefreshCw 
            size={18} 
            color="#ff7120"
            style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
          />
        </button>
      </div>

      {/* Substatus */}
      {status.substatus && (
        <SubstatusMessage 
          substatus={status.substatus}
          substatusMessage={status.substatusMessage}
        />
      )}

      {/* Transaction Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
        {status.sending && (
          <TxLink
            txHash={status.sending.txHash}
            txLink={status.sending.txLink}
            chainName="Source Chain"
            label="Source"
          />
        )}

        {status.receiving && (
          <TxLink
            txHash={status.receiving.txHash}
            txLink={status.receiving.txLink}
            chainName="Destination Chain"
            label="Destination"
          />
        )}

        {status.lifiExplorerLink && (
          <a
            href={status.lifiExplorerLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: 'linear-gradient(135deg, rgba(255, 113, 32, 0.1), rgba(255, 113, 32, 0.05))',
              border: '1px solid rgba(255, 113, 32, 0.3)',
              borderRadius: '10px',
              textDecoration: 'none',
              color: '#ff7120',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginTop: '8px',
            }}
          >
            View on Li.Fi Explorer
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Gas & Fee Info */}
      {(status.sending || status.receiving) && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: '#888',
            marginBottom: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Transaction Details
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
            {status.sending?.gasAmountUSD && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Source Gas:</span>
                <span style={{ color: '#f87171', fontWeight: 600 }}>
                  ${status.sending.gasAmountUSD}
                </span>
              </div>
            )}

            {status.receiving?.gasAmountUSD && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Destination Gas:</span>
                <span style={{ color: '#f87171', fontWeight: 600 }}>
                  ${status.receiving.gasAmountUSD}
                </span>
              </div>
            )}

            {status.receiving?.amountUSD && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}>
                <span style={{ color: '#888' }}>Received:</span>
                <span style={{ color: '#4CAF50', fontWeight: 700 }}>
                  ${status.receiving.amountUSD}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TransactionStatusTracker;
