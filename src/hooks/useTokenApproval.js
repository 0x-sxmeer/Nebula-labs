/**
 * useTokenApproval Hook - FIXED
 * ✅ Solves "Looping Approval" by trusting transaction receipts immediately (Optimistic UI)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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

export const useTokenApproval = ({
  tokenAddress,
  ownerAddress,
  spenderAddress,
  amount,
  decimals = 18,
  isNative = false,
  chainId,
}) => {
  const [status, setStatus] = useState(ApprovalStatus.UNKNOWN);
  const [error, setError] = useState(null);
  const [showUnlimitedWarning, setShowUnlimitedWarning] = useState(false);
  
  // Track if we just successfully approved in this session
  const [optimisticApproved, setOptimisticApproved] = useState(false);

  const skipApproval = isNative || !tokenAddress || !ownerAddress || !spenderAddress;

  // 1. Write approval
  const { 
    writeContractAsync: approveAsync, // Use Async for better error handling
    data: approvalTxHash,
    isPending: isApproving,
    reset: resetApproval
  } = useWriteContract();

  // 2. Wait for confirmation
  const { 
    isLoading: isConfirming, 
    isSuccess: isApprovalConfirmed 
  } = useWaitForTransactionReceipt({
    hash: approvalTxHash
  });

  // 3. Read current allowance
  const { 
    data: currentAllowance, 
    isLoading: isCheckingAllowance,
    refetch: refetchAllowance,
    error: allowanceCheckError
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress],
    chainId,
    query: {
      enabled: !skipApproval && !!tokenAddress && !!ownerAddress && !!spenderAddress,
      staleTime: 5000, // Increased stale time to prevent flickering
      retry: 2,
    }
  });

  // 4. Calculate required amount
  const requiredAmount = useCallback(() => {
    if (!amount || isNaN(parseFloat(amount))) return BigInt(0);
    try {
      return parseUnits(amount.toString(), decimals);
    } catch (e) {
      return BigInt(0);
    }
  }, [amount, decimals]);

  // 5. Determine if approval is needed (Logic Layer)
  const needsApproval = useCallback(() => {
    if (skipApproval) return false;
    if (optimisticApproved) return false; // Trust the recent transaction
    
    // If we haven't fetched data yet, assume needed unless we are native
    if (currentAllowance === undefined) return true;
    
    const required = requiredAmount();
    return currentAllowance < required;
  }, [skipApproval, currentAllowance, requiredAmount, optimisticApproved]);

  // 6. Main Status Logic
  useEffect(() => {
    // A. Native tokens never need approval
    if (skipApproval) {
      setStatus(ApprovalStatus.APPROVED);
      return;
    }

    // B. If we just confirmed a tx, force APPROVED status (Optimistic UI)
    if (isApprovalConfirmed || optimisticApproved) {
      setStatus(ApprovalStatus.APPROVED);
      if (!optimisticApproved) setOptimisticApproved(true);
      return;
    }

    // C. Handle Transaction States
    if (isApproving || isConfirming) {
      setStatus(ApprovalStatus.PENDING);
      return;
    }

    // D. Handle Data Fetching States
    // Only show "CHECKING" if we have NO data yet. 
    // If we have data but are refetching, keep showing the old status to prevent flicker.
    if (isCheckingAllowance && currentAllowance === undefined) {
      setStatus(ApprovalStatus.CHECKING);
      return;
    }

    if (allowanceCheckError) {
      // If RPC fails, but we thought we needed approval, stay on NEEDED
      // This prevents UI breaking on flaky RPCs
      logger.warn('Allowance check failed, defaulting to NEEDED', allowanceCheckError);
      setStatus(ApprovalStatus.NEEDED); 
      return;
    }

    // E. Final Calculation based on allowance
    if (currentAllowance !== undefined) {
      const required = requiredAmount();
      if (currentAllowance >= required) {
        setStatus(ApprovalStatus.APPROVED);
      } else {
        setStatus(ApprovalStatus.NEEDED);
      }
    }
  }, [
    skipApproval, 
    isApproving, 
    isConfirming, 
    isApprovalConfirmed, 
    optimisticApproved,
    currentAllowance, 
    isCheckingAllowance, 
    allowanceCheckError,
    requiredAmount
  ]);

  // 7. Silent Background Polling after Confirmation
  useEffect(() => {
    if (isApprovalConfirmed) {
      logger.log('✅ Transaction confirmed. Updating UI immediately.');
      setOptimisticApproved(true); // Lock UI to approved
      
      // Poll quietly in background to update cache
      const timer = setTimeout(() => {
        refetchAllowance();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isApprovalConfirmed, refetchAllowance]);

  // 8. Request Approval Action
  const requestApproval = useCallback(async (unlimited = false) => {
    setError(null);
    resetApproval();

    try {
      const amountToApprove = unlimited ? maxUint256 : requiredAmount();
      
      // Safety buffer for exact approvals (add 10% to avoid rounding errors)
      const finalAmount = unlimited ? maxUint256 : (amountToApprove * 110n) / 100n;

      logger.log(`🔐 Requesting approval for: ${tokenAddress}`);
      
      await approveAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, finalAmount]
      });
      
    } catch (err) {
      logger.error('❌ Approval failed:', err);
      if (err.message?.includes('User rejected')) {
        setError('Approval cancelled');
      } else {
        setError(err.message || 'Approval failed');
      }
    }
  }, [tokenAddress, spenderAddress, requiredAmount, approveAsync, resetApproval]);

  return {
    status,
    error,
    needsApproval: needsApproval(),
    // Combine states for easier UI consumption
    isApproved: status === ApprovalStatus.APPROVED || optimisticApproved,
    isPending: status === ApprovalStatus.PENDING,
    isChecking: status === ApprovalStatus.CHECKING,
    requestApproval,
    formattedAllowance: currentAllowance ? formatUnits(currentAllowance, decimals) : '0',
    approvalTxHash,
    resetError: () => setError(null),
    showUnlimitedWarning,
    setShowUnlimitedWarning,
  };
};

export default useTokenApproval;
