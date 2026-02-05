import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useSwap from '../useSwap'; // Default export? Check file.

// Mock Dependencies
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x123', isConnected: true, chain: { id: 1 } })),
  useChainId: vi.fn(() => 1),
  useSwitchChain: vi.fn(() => ({ switchChainAsync: vi.fn() })),
  useBalance: vi.fn(() => ({ data: { value: 1000000000000000000n, formatted: '1.0' } })),
  useReadContract: vi.fn(() => ({ data: 1000000n })),
  useWriteContract: vi.fn(() => ({ writeContractAsync: vi.fn() })),
  useConfig: vi.fn(() => ({})),
}));

vi.mock('../../services/lifiService', () => ({
  lifiService: {
    getRoutes: vi.fn().mockResolvedValue([]),
    getTokens: vi.fn().mockResolvedValue([]),
    getGasPrices: vi.fn().mockResolvedValue({}),
    getTokenInfo: vi.fn().mockResolvedValue({}),
  }
}));

// Mock Analytics
vi.mock('../../services/analyticsService', () => ({
  analytics: {
    trackEvent: vi.fn(),
  }
}));

// Mock Config
vi.mock('../../config/wagmi.config', () => ({
  config: {}
}));

// Mock Balance Checker
vi.mock('../../utils/balanceChecker', () => ({
  fetchTokenBalance: vi.fn(),
  checkSufficientBalance: vi.fn(),
  estimateGasCost: vi.fn()
}));

describe('useSwap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSwap());
    
    expect(result.current.routes).toEqual([]);
    // Loading might be true initially due to fetching tokens/gas on mount
    // so checking explicit false might be flaky if it starts fetching immediately.
  });
  
  it('should update amount', () => {
    const { result } = renderHook(() => useSwap());
    
    act(() => {
        result.current.setFromAmount('1.5');
    });
    
    expect(result.current.fromAmount).toBe('1.5');
  });
});
