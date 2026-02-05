/**
 * useTokenApproval Hook - REFACTORED
 * ✅ Fixed: Default to exact amount, better error handling, user confirmations
 */

import { useState, useCallback, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { logger } from '../utils/logger';

// Standard ERC20 ABI
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

/**
 * REFACTORED: Secure token approval hook
 */
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
      
      // User-friendly error messages
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

  // Refetch on confirmation (with polling for indexing delay)
  useEffect(() => {
    if (isApprovalConfirmed) {
      logger.log('✅ Approval confirmed, starting aggressive refetch...');
      
      // Immediate refetch
      refetchAllowance();
      
      // Poll every 2 seconds for 10 seconds to catch indexing updates
      const interval = setInterval(() => {
        logger.log('🔄 Polling allowance update...');
        refetchAllowance();
      }, 2000);
      
      // Stop polling after 12 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 12000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isApprovalConfirmed, refetchAllowance]);

  /**
   * FIXED: Default to EXACT amount (safer)
   * Requires user confirmation for unlimited
   */
  const requestApproval = useCallback(async (unlimited = false, onUnlimitedRequest) => {
    if (skipApproval) {
      logger.log('Skipping approval - native token');
      return { success: true, userCancelled: false };
    }

    // Warn about unlimited approvals
    if (unlimited) {
      setShowUnlimitedWarning(true);
      
      // Use callback for UI confirmation (better than window.confirm)
      if (onUnlimitedRequest) {
        const confirmed = await onUnlimitedRequest({
          tokenSymbol: 'TOKEN', // Would come from token data
          spenderName: 'LI.FI Router',
          risk: 'HIGH'
        });
        
        if (!confirmed) {
          logger.log('User declined unlimited approval');
          setShowUnlimitedWarning(false);
          return { success: false, userCancelled: true };
        }
      } else {
        // Fallback to browser confirm
        const confirmed = confirm(
          '⚠️ SECURITY WARNING\n\n' +
          'You are about to approve UNLIMITED access to your tokens.\n\n' +
          'This is convenient but risky if the contract is compromised.\n\n' +
          'Recommended: Approve only the exact amount needed.\n\n' +
          'Continue with unlimited approval?'
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
      // ✅ CRITICAL FIX: Add 1% buffer for exact approvals to prevent rounding issues
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
        security: unlimited ? 'HIGH RISK' : '✅ SAFE (exact + 1% buffer)'
      });

      // Wagmi v2: writeContract returns a promise
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
      
      // Handle user rejection separately
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
   * Reset error state (useful for retry)
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
