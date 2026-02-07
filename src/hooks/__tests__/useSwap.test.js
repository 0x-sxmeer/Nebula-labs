
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSwap } from '../useSwap';
import { lifiService } from '../../services/lifiService';

// Mock Dependencies
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0xUser', isConnected: true, chain: { id: 1 } })),
  useChainId: vi.fn(() => 1),
  useSwitchChain: vi.fn(() => ({ switchChainAsync: vi.fn() })),
  useBalance: vi.fn(() => ({ data: { value: 1000000000000000000n, formatted: '1.0' } })),
  useReadContract: vi.fn(() => ({ data: 1000000n })),
  useWriteContract: vi.fn(() => ({ writeContractAsync: vi.fn() })),
  useConfig: vi.fn(() => ({})),
  createConfig: vi.fn(),
  fallback: vi.fn(),
  http: vi.fn(),
}));

vi.mock('../../services/lifiService', () => ({
  lifiService: {
    getRoutes: vi.fn(),
    getTokens: vi.fn().mockResolvedValue([]),
    getGasPrices: vi.fn().mockResolvedValue({ standard: 20000000000 }),
    getTokenInfo: vi.fn().mockResolvedValue({}),
    getTools: vi.fn().mockResolvedValue({ bridges: [], exchanges: [] }),
    getTokensCached: vi.fn(() => null)
  }
}));

vi.mock('../../services/analyticsService', () => ({
  analytics: { trackEvent: vi.fn() }
}));

vi.mock('../../utils/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

describe('useSwap Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSwap('0xUser'));
    
    expect(result.current.fromChain.id).toBe(1);
    expect(result.current.toChain.id).toBe(1);
    expect(result.current.routes).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should update amount and debounce route fetching', async () => {
    const { result } = renderHook(() => useSwap('0xUser'));
    
    // 1. Initial State
    expect(result.current.fromAmount).toBe('');

    // 2. Set Amount
    act(() => {
        result.current.setFromAmount('1.0');
    });
    
    expect(result.current.fromAmount).toBe('1.0');
    expect(lifiService.getRoutes).not.toHaveBeenCalled(); // Debounce active

    // 3. Fast Forward Timer
    await act(async () => {
        vi.advanceTimersByTime(600); // > 500ms
    });

    // 4. Expect Fetch
    expect(lifiService.getRoutes).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    lifiService.getRoutes.mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useSwap('0xUser'));

    act(() => {
        result.current.setFromAmount('1.0');
    });

    await act(async () => {
        vi.advanceTimersByTime(600);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it('should switch tokens correctly', () => {
    const { result } = renderHook(() => useSwap('0xUser'));
    
    const initialFrom = result.current.fromToken;
    const initialTo = result.current.toToken;

    act(() => {
        result.current.switchTokens();
    });

    expect(result.current.fromToken).toEqual(initialTo);
    expect(result.current.toToken).toEqual(initialFrom);
  });

  it('should clear routes when amount is cleared', async () => {
    const { result } = renderHook(() => useSwap('0xUser'));

    act(() => {
        result.current.setFromAmount('1.0');
    });
    
    await act(async () => {
        vi.advanceTimersByTime(600);
    });
    
    // Simulate routes loaded
    expect(lifiService.getRoutes).toHaveBeenCalled();

    // Clear amount
    act(() => {
        result.current.setFromAmount('');
    });

    // Should clear immediately
    expect(result.current.routes).toEqual([]);
  });
});
