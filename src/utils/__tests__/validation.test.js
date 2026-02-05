import { describe, it, expect } from 'vitest';
import { validateAddress, validateAmount, validateSlippage, validateRoute, sanitizeInput } from '../validation';

describe('Validation Utilities', () => {
  describe('validateAddress', () => {
    it('should return true for valid Ethereum addresses', () => {
      expect(validateAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(validateAddress('0xInvalid')).toBe(false);
      expect(validateAddress('NotAnAddress')).toBe(false);
      expect(validateAddress('')).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('should validate correct amounts', () => {
      expect(validateAmount('1.5').valid).toBe(true);
      expect(validateAmount('100').valid).toBe(true);
    });

    it('should reject zero when not allowed', () => {
      const result = validateAmount('0');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject negative numbers', () => {
      const result = validateAmount('-5');
      expect(result.valid).toBe(false);
    });

    it('should reject non-numeric strings', () => {
      expect(validateAmount('abc').valid).toBe(false);
    });

    it('should respect max balance', () => {
      const result = validateAmount('10', 18, { max: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });
  });

  describe('validateSlippage', () => {
    it('should accept valid slippage', () => {
      expect(validateSlippage('0.5').valid).toBe(true);
      expect(validateSlippage('1').valid).toBe(true);
    });

    it('should reject negative slippage', () => {
      expect(validateSlippage('-1').valid).toBe(false);
    });

    it('should reject slippage > 50%', () => {
      expect(validateSlippage('51').valid).toBe(false);
    });

    it('should warn on high slippage', () => {
      const result = validateSlippage('10');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
    });
  });

  describe('validateRoute', () => {
    it('should reject null route', () => {
      expect(validateRoute(null).valid).toBe(false);
    });

    it('should reject route without steps', () => {
      expect(validateRoute({}).valid).toBe(false);
      expect(validateRoute({ steps: [] }).valid).toBe(false);
    });

    it('should accept valid route', () => {
      expect(validateRoute({ steps: [{}] }).valid).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove special characters', () => {
      expect(sanitizeInput('123$#@')).toBe('123');
    });

    it('should keep decimals', () => {
      expect(sanitizeInput('12.34')).toBe('12.34');
    });
  });
});
