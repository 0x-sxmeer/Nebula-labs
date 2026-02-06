import { describe, it, expect } from 'vitest';
import { validateAddress, validateAmount, validateSlippage, validateRoute, sanitizeInput, sanitizeNumericInput, validateSwapAmount } from '../validation';

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

// =========================================
// SECURITY TESTS - sanitizeNumericInput
// =========================================

describe('sanitizeNumericInput - Security Tests', () => {
  describe('Basic functionality', () => {
    it('should accept valid decimal numbers', () => {
      expect(sanitizeNumericInput('123.456')).toBe('123.456');
      expect(sanitizeNumericInput('0.5')).toBe('0.5');
      expect(sanitizeNumericInput('1000')).toBe('1000');
    });

    it('should handle empty input', () => {
      expect(sanitizeNumericInput('')).toBe('');
      expect(sanitizeNumericInput(null)).toBe('');
      expect(sanitizeNumericInput(undefined)).toBe('');
    });
  });

  describe('Security - Injection Prevention', () => {
    it('should reject scientific notation (e.g., 1e18)', () => {
      expect(sanitizeNumericInput('1e18')).toBe('118'); // e is removed
      expect(sanitizeNumericInput('1E6')).toBe('16');
      expect(sanitizeNumericInput('1.5e10')).toBe('1.510');
    });

    it('should reject negative numbers', () => {
      expect(sanitizeNumericInput('-100')).toBe('100'); // minus removed
      expect(sanitizeNumericInput('-0.5')).toBe('0.5');
    });

    it('should reject XSS attempts', () => {
      expect(sanitizeNumericInput('<script>alert(1)</script>')).toBe('1');
      expect(sanitizeNumericInput('javascript:void(0)')).toBe('0');
    });

    it('should handle multiple decimal points', () => {
      expect(sanitizeNumericInput('1.2.3')).toBe('1.23');
      expect(sanitizeNumericInput('100.00.00')).toBe('100.0000');
    });

    it('should prevent overflow values', () => {
      expect(sanitizeNumericInput('9999999999999')).toBe(''); // > 1e12
      expect(sanitizeNumericInput('999999999999')).toBe('999999999999'); // exactly 1e12
    });
  });

  describe('Edge Cases', () => {
    it('should handle leading zeros correctly', () => {
      expect(sanitizeNumericInput('007')).toBe('7');
      expect(sanitizeNumericInput('0.123')).toBe('0.123');
      expect(sanitizeNumericInput('00.5')).toBe('0.5');
    });

    it('should respect decimal limit parameter', () => {
      expect(sanitizeNumericInput('1.123456789', 6)).toBe('1.123456');
      expect(sanitizeNumericInput('1.12', 2)).toBe('1.12');
    });

    it('should handle just a decimal point', () => {
      expect(sanitizeNumericInput('.')).toBe('');
    });

    it('should handle spaces and special chars', () => {
      expect(sanitizeNumericInput('1 000')).toBe('1000');
      expect(sanitizeNumericInput('$100.50')).toBe('100.50');
      expect(sanitizeNumericInput('100,000.50')).toBe('100000.50');
    });
  });
});

describe('validateSwapAmount', () => {
  it('should reject zero amounts', () => {
    const result = validateSwapAmount('0');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('greater than 0');
  });

  it('should reject excess decimals', () => {
    const result = validateSwapAmount('1.123456789', 6);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('decimal places');
  });

  it('should validate against balance', () => {
    const result = validateSwapAmount('100', 18, BigInt('50000000000000000000')); // balance = 50
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Exceeds balance');
  });

  it('should accept valid amounts within balance', () => {
    const result = validateSwapAmount('10', 18, BigInt('100000000000000000000')); // balance = 100
    expect(result.valid).toBe(true);
  });
});
