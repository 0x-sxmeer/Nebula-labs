import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSwapExecution } from '../useSwapExecution';

// Mock Dependencies
vi.mock('wagmi', () => ({
  useSendTransaction: vi.fn(() => ({ sendTransactionAsync: vi.fn() })),
  useSwitchChain: vi.fn(() => ({ switchChainAsync: vi.fn() })),
  useAccount: vi.fn(() => ({ address: '0x123', isConnected: true, chain: { id: 1 } })),
  usePublicClient: vi.fn(() => ({ 
      getBalance: vi.fn().mockResolvedValue(1000000000000000000n), 
      getGasPrice: vi.fn().mockResolvedValue(1000000000n) 
  })),
}));

vi.mock('../useSwapMonitoring', () => ({
  default: vi.fn(() => ({ monitorTransaction: vi.fn(), monitoringState: {} }))
}));

vi.mock('../../services/lifiService', () => ({
    lifiService: {
        getStepTransaction: vi.fn()
    }
}));

vi.mock('../../utils/logger', () => ({
    logger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

vi.mock('../../services/analyticsService', () => ({
    analytics: {
        trackEvent: vi.fn(),
        trackSwap: vi.fn(),
        trackError: vi.fn(),
    }
}));

describe('useSwapExecution - Logic Security', () => {
    it('should throw "Approval required" if ERC20 token is not approved', async () => {
        const { result } = renderHook(() => useSwapExecution());
        
        const params = {
            selectedRoute: { fromChainId: 1, toChainId: 1, steps: [], timestamp: Date.now() },
            fromToken: { address: '0xTokenAddress', symbol: 'USDC', decimals: 6 },
            toToken: { address: '0xOtherToken' },
            fromAmount: '10',
            hasSufficientBalance: true,
            checkBalance: vi.fn(),
            isApproved: false, // Should trigger error
        };

        await expect(result.current.executeSwap(params))
            .rejects.toThrow('Approval required');
    });

    it('should NOT throw "Approval required" for Native Token (ETH)', async () => {
        const { result } = renderHook(() => useSwapExecution());
        
        const params = {
            selectedRoute: { fromChainId: 1, toChainId: 1, steps: [], timestamp: Date.now() },
            fromToken: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
            toToken: { address: '0xOtherToken' },
            fromAmount: '0.1',
            hasSufficientBalance: true,
            checkBalance: vi.fn(),
            isApproved: false, // Should be ignored for ETH
        };

        try {
            await result.current.executeSwap(params);
        } catch(e) {
            // It might fail on "No route selected" or other validation, but it MUST NOT be approval
            expect(e.message).not.toContain('Approval required');
        }
    });

    it('should pass validation if ERC20 token IS approved', async () => {
        const { result } = renderHook(() => useSwapExecution());
        
        const params = {
            selectedRoute: { fromChainId: 1, toChainId: 1, steps: [], timestamp: Date.now() },
            fromToken: { address: '0xTokenAddress', symbol: 'USDC', decimals: 6 },
            toToken: { address: '0xOtherToken' },
            fromAmount: '10',
            hasSufficientBalance: true,
            checkBalance: vi.fn(),
            isApproved: true, // Should pass approval check
        };
        
        try {
            await result.current.executeSwap(params);
        } catch (e) {
            // Should verify it proceeds past approval check
             expect(e.message).not.toContain('Approval required');
        }
    });
});

describe('useSwapExecution - Freshness Validation', () => {
    it('should allow 55s old route for initial check (limit 60s) but fail pre-send (limit 45s)', async () => {
        const { result } = renderHook(() => useSwapExecution());
        
        const oldTimestamp = Date.now() - 55000; // 55s old

        // ✅ Mock successful transaction preparation so we reach the final validation
        const { lifiService } = await import('../../services/lifiService');
        lifiService.getStepTransaction.mockResolvedValue({
            transactionRequest: { 
                to: '0x123', 
                data: '0x', 
                value: '0', 
                gasLimit: '100000' 
            }
        });

        const params = {
            selectedRoute: { 
                fromChainId: 1, toChainId: 1, steps: [], 
                timestamp: oldTimestamp 
            },
            fromToken: { address: '0xToken', symbol: 'USDC', decimals: 6 },
            toToken: { address: '0xOther' },
            fromAmount: '10',
            hasSufficientBalance: true,
            checkBalance: vi.fn(),
            isApproved: true,
        };

        // Should fail because it eventually hits 'pre-send' check in executeSwap
        // The first check (initial) passes, but the last check (pre-send) throws
        await expect(result.current.executeSwap(params))
            .rejects.toThrow('Quote expired');
    });
});
