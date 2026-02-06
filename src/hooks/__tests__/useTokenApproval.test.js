
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTokenApproval, ApprovalStatus } from '../useTokenApproval';

// Mock Wagmi
const mockRefetchAllowance = vi.fn();
const mockApprove = vi.fn();
const mockResetApproval = vi.fn();

vi.mock('wagmi', () => ({
  useReadContract: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    refetch: mockRefetchAllowance,
    isError: false
  })),
  useWriteContract: vi.fn(() => ({
    writeContract: mockApprove,
    data: undefined, // hash
    isPending: false,
    error: null,
    reset: mockResetApproval
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    isLoading: false,
    isSuccess: false
  })),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }
}));

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

describe('useTokenApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should skip approval for native tokens', () => {
    // Setup logic for skipping
    const { result } = renderHook(() => useTokenApproval({
        tokenAddress: '0xNative',
        ownerAddress: '0xUser',
        spenderAddress: '0xSpender',
        amount: '1.0',
        isNative: true
    }));

    expect(result.current.status).toBe(ApprovalStatus.APPROVED);
    expect(result.current.isApproved).toBe(true);
    expect(result.current.needsApproval).toBe(false);
  });

  it('should report CHECKING status while loading allowance', () => {
    useReadContract.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: mockRefetchAllowance,
    });

    const { result } = renderHook(() => useTokenApproval({
        tokenAddress: '0xERC20',
        ownerAddress: '0xUser',
        spenderAddress: '0xSpender',
        amount: '10.0',
        isNative: false
    }));

    expect(result.current.status).toBe(ApprovalStatus.CHECKING);
  });

  it('should report NEEDED status when allowance < amount', () => {
    useReadContract.mockReturnValue({
        data: 5000000n, // Less than required
        isLoading: false,
        refetch: mockRefetchAllowance,
    });

    const { result } = renderHook(() => useTokenApproval({
        tokenAddress: '0xERC20',
        ownerAddress: '0xUser',
        spenderAddress: '0xSpender',
        amount: '10.0', // Requires 10 * 10^18
        decimals: 18,
        isNative: false
    }));

    expect(result.current.status).toBe(ApprovalStatus.NEEDED);
    expect(result.current.needsApproval).toBe(true);
  });

  it('should report APPROVED status when allowance >= amount', () => {
    useReadContract.mockReturnValue({
        data: 10000000000000000000n, // Exact match
        isLoading: false,
        refetch: mockRefetchAllowance,
    });

    const { result } = renderHook(() => useTokenApproval({
        tokenAddress: '0xERC20',
        ownerAddress: '0xUser',
        spenderAddress: '0xSpender',
        amount: '10.0',
        isNative: false
    }));

    expect(result.current.status).toBe(ApprovalStatus.APPROVED);
    expect(result.current.needsApproval).toBe(false);
  });

  it('should start polling after successful approval confirmation', async () => {
    // 1. Initial State: Approval Needed
    useReadContract.mockReturnValue({
        data: 0n,
        isLoading: false,
        refetch: mockRefetchAllowance.mockResolvedValue({ data: 0n }),
    });

    // 2. Mock Confirmation
    useWaitForTransactionReceipt.mockReturnValue({
        isLoading: false,
        isSuccess: true // Confirmed!
    });

    renderHook(() => useTokenApproval({
        tokenAddress: '0xERC20',
        ownerAddress: '0xUser',
        spenderAddress: '0xSpender',
        amount: '1.0',
        isNative: false
    }));

    // Expect immediate refetch due to confirmation
    expect(mockRefetchAllowance).toHaveBeenCalled();

    // Advance timer to trigger poll
    await act(async () => {
        vi.advanceTimersByTime(3000); // 1st poll
    });

    expect(mockRefetchAllowance).toHaveBeenCalledTimes(2); // Initial + 1st poll
  });
});
