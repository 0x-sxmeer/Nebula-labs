import { describe, test, expect } from 'vitest'; // Assuming Vitest or Jest
import { toBaseUnit } from '../services/lifiService'; // Need to export this for testing or test via public API
import { validateRoute } from '../utils/routeValidation';

// Tests
describe('Swap Amount Fixes', () => {
  describe('Route Validation', () => {
    test('Valid route passes', () => {
      const validRoute = {
        fromAmount: '1000000',
        toAmount: '2000000',
        toAmountMin: '1980000',
        steps: [{
          id: 'step1',
          type: 'swap',
          tool: 'uniswap',
          action: { fromToken: {}, toToken: {}, fromAmount: '1000000' },
          estimate: { toAmount: '2000000', gasCosts: [{}] }
        }]
      };
      
      const result = validateRoute(validRoute);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('Invalid route fails', () => {
      const invalidRoute = {
        fromAmount: '1000000',
        // Missing toAmount, toAmountMin, steps
      };
      
      const result = validateRoute(invalidRoute);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
