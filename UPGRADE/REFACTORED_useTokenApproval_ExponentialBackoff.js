// ✅ REFACTORED: useTokenApproval.js - Critical Fix #4
// Exponential backoff polling to prevent RPC rate limiting

import { useState, useCallback, useEffect, useRef } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { logger } from '../utils/logger';

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
];

export const ApprovalStatus = {
  UNKNOWN: 'unknown',
  CHECKING: 'checking',
  NEEDED: 'needed',
  APPROVED: 'approved',
  PENDING: 'pending',
  ERROR: 'error'
};

export const useTokenApproval = ({
  tokenAddress,
  ownerAddress,
  spenderAddress,
  amount,
  decimals = 18,
  isNative = false
}) => {
  const [status, setStatus] = useState(ApprovalStatus.UNKNOWN);
  const [error, setError] = useState(null);
  const [showUnlimitedWarning, setShowUnlimitedWarning] = useState(false);
  
  const pollingTimeoutRef = useRef(null);
  
  const skipApproval = isNative || !tokenAddress || !ownerAddress || !spenderAddress;
  
  // Read current allowance
  const { 
    data: currentAllowance, 
    isLoading: isCheckingAllowance,
    refetch: refetchAllowance,
    isError: allowanceError
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress],
    query: {
      enabled: !skipApproval && !!tokenAddress && !!ownerAddress && !!spenderAddress
    }
  });
  
  // Write approval
  const { 
    writeContract: approve,
    data: approvalTxHash,
    isPending: isApproving,
    error: approvalError,
    reset: resetApproval
  } = useWriteContract();
  
  // Wait for confirmation
  const { 
    isLoading: isConfirming, 
    isSuccess: isApprovalConfirmed 
  } = useWaitForTransactionReceipt({
    hash: approvalTxHash
  });
  
  // Calculate required amount
  const requiredAmount = useCallback(() => {
    if (!amount || isNaN(parseFloat(amount))) return BigInt(0);
    try {
      return parseUnits(amount.toString(), decimals);
    } catch (e) {
      logger.error('Failed to parse amount:', e);
      return BigInt(0);
    }
  }, [amount, decimals]);
  
  // Check if approval needed
  const needsApproval = useCallback(() => {
    if (skipApproval) return false;
    if (currentAllowance === undefined) return true;
    
    const required = requiredAmount();
    return currentAllowance < required;
  }, [skipApproval, currentAllowance, requiredAmount]);
  
  // Update status
  useEffect(() => {
    if (skipApproval) {
      setStatus(ApprovalStatus.APPROVED);
      return;
    }
    
    if (isCheckingAllowance) {
      setStatus(ApprovalStatus.CHECKING);
      return;
    }
    
    if (allowanceError) {
      setStatus(ApprovalStatus.ERROR);
      setError('Failed to check allowance');
      return;
    }
    
    if (isApproving || isConfirming) {
      setStatus(ApprovalStatus.PENDING);
      return;
    }
    
    if (approvalError) {
      setStatus(ApprovalStatus.ERROR);
      
      if (approvalError.message?.includes('User rejected') ||
          approvalError.message?.includes('User denied')) {
        setError('Approval cancelled by user');
      } else {
        setError(approvalError.message || 'Approval failed');
      }
      return;
    }
    
    if (needsApproval()) {
      setStatus(ApprovalStatus.NEEDED);
    } else {
      setStatus(ApprovalStatus.APPROVED);
    }
  }, [
    skipApproval, 
    isCheckingAllowance, 
    allowanceError, 
    isApproving, 
    isConfirming, 
    approvalError, 
    needsApproval
  ]);
  
  /**
   * ✅ CRITICAL FIX #4: Exponential backoff polling
   * Prevents RPC rate limiting and wallet disconnections
   */
  useEffect(() => {
    if (isApprovalConfirmed) {
      logger.log('✅ Approval confirmed, starting smart polling...');
      
      // ✅ Clear any existing polling timeout
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      
      // Immediate refetch
      refetchAllowance();
      
      // ✅ FIX: Exponential backoff polling
      let pollAttempts = 0;
      const maxPolls = 5;
      
      const pollAllowance = () => {
        if (pollAttempts >= maxPolls) {
          logger.log('⏰ Stopped polling after max attempts');
          return;
        }
        
        // ✅ Exponential backoff: 3s, 4.5s, 6.75s, 10s, 10s
        const delay = Math.min(3000 * Math.pow(1.5, pollAttempts), 10000);
        
        pollingTimeoutRef.current = setTimeout(() => {
          logger.log(`🔄 Polling attempt ${pollAttempts + 1}/${maxPolls} (delay: ${delay}ms)`);
          
          refetchAllowance()
            .then(result => {
              // ✅ Stop polling if approval is detected
              if (result.data && result.data >= requiredAmount()) {
                logger.log('✅ Approval detected, stopping polling');
                return;
              }
              
              // Continue polling
              pollAttempts++;
              pollAllowance();
            })
            .catch(err => {
              logger.error('Polling error:', err);
              pollAttempts++;
              pollAllowance(); // Continue even on error
            });
        }, delay);
      };
      
      // Start exponential backoff polling
      pollAllowance();
      
      // ✅ CRITICAL: Cleanup on unmount
      return () => {
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
      };
    }
  }, [isApprovalConfirmed, refetchAllowance, requiredAmount]);
  
  /**
   * Request approval with enhanced security warnings
   */
  const requestApproval = useCallback(async (unlimited = false, onUnlimitedRequest) => {
    if (skipApproval) {
      logger.log('Skipping approval - native token');
      return { success: true, userCancelled: false };
    }
    
    // ✅ Enhanced unlimited approval warning
    if (unlimited) {
      setShowUnlimitedWarning(true);
      
      // Use callback for UI confirmation
      if (onUnlimitedRequest) {
        const confirmed = await onUnlimitedRequest({
          tokenSymbol: 'TOKEN',
          spenderName: 'LI.FI Router',
          risk: 'HIGH'
        });
        
        if (!confirmed) {
          logger.log('User declined unlimited approval');
          setShowUnlimitedWarning(false);
          return { success: false, userCancelled: true };
        }
      } else {
        // ✅ Enhanced browser confirm with stronger warning
        const confirmed = confirm(
          '⛔ CRITICAL SECURITY WARNING\n\n' +
          'You are about to approve UNLIMITED access to your tokens.\n\n' +
          '🔴 RISKS:\n' +
          '• Contract bugs could drain your entire balance\n' +
          '• Phishing attacks can steal all your tokens\n' +
          '• Compromised contracts = total loss\n\n' +
          '✅ RECOMMENDED: Approve only the exact amount needed.\n\n' +
          '⚠️ Are you ABSOLUTELY SURE you want unlimited approval?'
        );
        
        if (!confirmed) {
          setShowUnlimitedWarning(false);
          return { success: false, userCancelled: true };
        }
      }
      
      setShowUnlimitedWarning(false);
    }
    
    setError(null);
    resetApproval();
    
    try {
      // ✅ Add 1% buffer for exact approvals
      let approvalAmount;
      
      if (unlimited) {
        approvalAmount = maxUint256;
      } else {
        const exactAmount = requiredAmount();
        const buffer = exactAmount / 100n; // 1% buffer
        approvalAmount = exactAmount + buffer;
        
        logger.log('🔐 Approval with 1% buffer:', {
          exact: formatUnits(exactAmount, decimals),
          withBuffer: formatUnits(approvalAmount, decimals),
          buffer: formatUnits(buffer, decimals)
        });
      }
      
      logger.log('🔐 Requesting approval:', {
        token: tokenAddress,
        spender: spenderAddress,
        amount: unlimited ? 'Unlimited ⚠️' : formatUnits(approvalAmount, decimals),
        security: unlimited ? '🔴 HIGH RISK' : '✅ SAFE (exact + 1% buffer)'
      });
      
      const hash = await approve({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, approvalAmount]
      });
      
      logger.log('✅ Approval transaction submitted:', hash);
      return { success: true, hash, userCancelled: false };
      
    } catch (err) {
      logger.error('❌ Approval failed:', err);
      
      if (err.message?.includes('User rejected') || 
          err.message?.includes('User denied')) {
        setError('Approval cancelled by user');
        return { success: false, userCancelled: true };
      }
      
      setError(err.message || 'Approval failed');
      return { success: false, userCancelled: false, error: err };
    }
  }, [skipApproval, tokenAddress, spenderAddress, decimals, requiredAmount, approve, resetApproval]);
  
  /**
   * Revoke approval (set to 0)
   */
  const revokeApproval = useCallback(async () => {
    if (skipApproval) return;
    
    try {
      const hash = await approve({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, BigInt(0)]
      });
      
      logger.log('✅ Revoked approval:', hash);
    } catch (err) {
      logger.error('❌ Revoke failed:', err);
      setError(err.message);
    }
  }, [skipApproval, tokenAddress, spenderAddress, approve]);
  
  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
    resetApproval();
  }, [resetApproval]);
  
  return {
    status,
    error,
    needsApproval: needsApproval(),
    isApproved: status === ApprovalStatus.APPROVED,
    isPending: status === ApprovalStatus.PENDING,
    isChecking: status === ApprovalStatus.CHECKING,
    currentAllowance,
    formattedAllowance: currentAllowance 
      ? formatUnits(currentAllowance, decimals) 
      : '0',
    requestApproval,
    revokeApproval,
    refetchAllowance,
    approvalTxHash,
    resetError,
    showUnlimitedWarning,
    setShowUnlimitedWarning,
  };
};

export default useTokenApproval;
