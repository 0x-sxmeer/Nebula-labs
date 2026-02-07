import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lifiService } from '../lifiService';

// Mock global fetch
global.fetch = vi.fn();

describe('lifiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRoutes', () => {
    it('should fetch routes successfully', async () => {
      const mockResponse = { routes: [{ id: 'route-1' }] };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await lifiService.getRoutes({
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: '0xETH',
        toTokenAddress: '0xMATIC',
        fromAmount: '1', // Human readable
        fromTokenDecimals: 18, // Required
        fromAddress: '0xUser'
      });

      expect(result).toEqual(mockResponse.routes);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid token' }),
      });

      await expect(lifiService.getRoutes({})).rejects.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return status', async () => {
      const mockStatus = { status: 'DONE', subStatus: 'COMPLETED' };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await lifiService.getStatus({
        txHash: '0xTxHash',
        bridge: 'bridge',
        fromChain: 1,
        toChain: 137
      });
      expect(result).toEqual(mockStatus);
    });
  });
});
