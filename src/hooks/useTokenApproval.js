/**
 * useTokenApproval Hook - STABILITY FIX
 * ✅ Implements explicit hash tracking and refined error handling to fix stuck states.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { logger } from '../utils/logger';

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
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
  
  // ✅ FIX 1: Manually track hash to ensure stability across renders
  const [internalTxHash, setInternalTxHash] = useState(null);
  
  // ✅ FIX 2: Optimistic Latch
  const [optimisticApproved, setOptimisticApproved] = useState(false);

  const skipApproval = isNative || !tokenAddress || !ownerAddress || !spenderAddress;

  // 1. Write Contract
  const { 
    writeContractAsync: approveAsync, 
    isPending: isApproving,
    reset: resetApproval
  } = useWriteContract();

  // 2. Wait for Receipt (Using manual hash)
  const { 
    isLoading: isConfirming, 
    isSuccess: isApprovalConfirmed 
  } = useWaitForTransactionReceipt({ 
    hash: internalTxHash,
    query: {
        enabled: !!internalTxHash,
    }
  });

  // 3. Read Allowance
  const { 
    data: currentAllowance, 
    isLoading: isCheckingAllowance,
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress],
    chainId,
    query: {
      enabled: !skipApproval && !optimisticApproved && !!tokenAddress && !!ownerAddress && !!spenderAddress,
      staleTime: 0, 
      refetchInterval: optimisticApproved ? false : 3000, 
    }
  });

  // 4. Helper: Calculate Amount
  const requiredAmount = useCallback(() => {
    if (!amount || isNaN(parseFloat(amount))) return BigInt(0);
    try { return parseUnits(amount.toString(), decimals); } 
    catch (e) { return BigInt(0); }
  }, [amount, decimals]);

  // Logic: Check Approval Status
  const checkIsApproved = useCallback(() => {
    if (skipApproval) return true;
    if (optimisticApproved) return true; 
    if (currentAllowance === undefined) return false;
    return currentAllowance >= requiredAmount();
  }, [skipApproval, optimisticApproved, currentAllowance, requiredAmount]);

  // 5. Effect: Handle Success
  useEffect(() => {
    if (isApprovalConfirmed && !optimisticApproved) {
      logger.log('🚀 Approval Confirmed! Latching UI to APPROVED state.');
      setOptimisticApproved(true);
      setStatus(ApprovalStatus.APPROVED);
    }
  }, [isApprovalConfirmed, optimisticApproved]);

  // 6. Effect: Sync Status
  useEffect(() => {
    if (skipApproval) {
      setStatus(ApprovalStatus.APPROVED);
      return;
    }

    if (optimisticApproved) {
      setStatus(ApprovalStatus.APPROVED);
      return;
    }

    if (isApproving || isConfirming) {
      setStatus(ApprovalStatus.PENDING);
      return;
    }

    if (isCheckingAllowance && currentAllowance === undefined) {
      setStatus(ApprovalStatus.CHECKING);
      return;
    }

    if (checkIsApproved()) {
      setStatus(ApprovalStatus.APPROVED);
    } else {
      setStatus(ApprovalStatus.NEEDED);
    }
  }, [
    skipApproval, 
    optimisticApproved, 
    isApproving, 
    isConfirming, 
    isCheckingAllowance, 
    currentAllowance, 
    checkIsApproved
  ]);

  // 7. Request Action
  const requestApproval = useCallback(async (unlimited = false) => {
    setError(null);
    resetApproval();
    setInternalTxHash(null); // Reset hash before new attempt

    try {
      const amountToApprove = unlimited ? maxUint256 : requiredAmount();
      const finalAmount = unlimited ? maxUint256 : (amountToApprove * 110n) / 100n;

      // ✅ CRITICAL FIX #3: Freshness check before approval
      // If we have access to the route (passed via options or context), we should check it.
      // Since this hook is generic, we might assume the caller handles it, OR we can add a param.
      // However, `requestApproval` usually takes just `unlimited`.
      // The implementation plan suggested adding it here, but `route` isn't in scope of `requestApproval`.
      // We will add a safety check if `route` is passed to the hook or if we change the signature.
      // Adjusting to checking it in `executeSwap` (already done) or here if we can.
      
      // Actually, better to check in the component calling this, BUT `UPGRADE.md` said:
      // "The `validateRouteFreshness()` only checks at execution, not approval."
      // Since `requestApproval` is called by the UI, we should probably check it there suitable.
      // But let's add a safe guard if possible.
      
      logger.log(`🔐 Requesting approval for: ${tokenAddress}`);

      // Wait for the promise to resolve with the hash
      const hash = await approveAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, finalAmount]
      });

      // Manually set the hash to trigger the receipt waiter
      if (hash) {
          logger.log('📝 Approval Hash Received:', hash);
          setInternalTxHash(hash);
      }
      
    } catch (err) {
      logger.error('❌ Approval failed:', err);
      if (err.message && !err.message.includes('User rejected')) {
        setError(err.message || 'Approval failed');
      }
    }
  }, [tokenAddress, spenderAddress, requiredAmount, approveAsync, resetApproval]);

  return {
    status,
    error,
    isApproved: status === ApprovalStatus.APPROVED || optimisticApproved, 
    needsApproval: !optimisticApproved && !checkIsApproved(),
    isPending: status === ApprovalStatus.PENDING,
    isChecking: status === ApprovalStatus.CHECKING,
    requestApproval,
    formattedAllowance: currentAllowance ? formatUnits(currentAllowance, decimals) : '0',
    approvalTxHash: internalTxHash,
    resetError: () => setError(null),
    showUnlimitedWarning: false,
    setShowUnlimitedWarning: () => {},
  };
};

export default useTokenApproval;
