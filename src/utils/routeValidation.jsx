/**
 * ✅ FIXED: Comprehensive Route Validation
 * 
 * Validates LiFi route structures to prevent UI crashes and incorrect displays
 * Catches malformed data early before it reaches the UI
 */

import { useState, useEffect } from 'react';

/**
 * Validation result type
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the route is valid
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 */

/**
 * Validates a single route's structure and data integrity
 * @param {Object} route - The route object to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult}
 */
export const validateRoute = (route, options = {}) => {
  const errors = [];
  const warnings = [];
  
  // === NULL/UNDEFINED CHECK ===
  if (!route || typeof route !== 'object') {
    errors.push('Route is null or not an object');
    return { isValid: false, errors, warnings };
  }
  
  // === REQUIRED FIELDS ===
  const requiredFields = [
    { name: 'fromAmount', type: 'string' },
    { name: 'toAmount', type: 'string' },
    { name: 'toAmountMin', type: 'string' },
    { name: 'steps', type: 'array' },
  ];
  
  requiredFields.forEach(({ name, type }) => {
    if (!(name in route) || route[name] === null || route[name] === undefined) {
      errors.push(`Missing required field: ${name}`);
      return;
    }
    
    // Type validation
    if (type === 'array' && !Array.isArray(route[name])) {
      errors.push(`Field ${name} must be an array, got ${typeof route[name]}`);
    } else if (type === 'string' && typeof route[name] !== 'string') {
      errors.push(`Field ${name} must be a string, got ${typeof route[name]}`);
    }
  });
  
  // === AMOUNT VALIDATION ===
  // Check amounts are numeric strings
  const amountFields = ['fromAmount', 'toAmount', 'toAmountMin'];
  amountFields.forEach(field => {
    if (route[field]) {
      try {
        const bigIntValue = BigInt(route[field]);
        if (bigIntValue < 0n) {
          errors.push(`${field} cannot be negative: ${route[field]}`);
        }
        if (bigIntValue === 0n) {
          warnings.push(`${field} is zero - this may be intentional but unusual`);
        }
      } catch (error) {
        errors.push(`${field} is not a valid BigInt: ${route[field]}`);
      }
    }
  });
  
  // === AMOUNT CONSISTENCY ===
  if (route.toAmount && route.toAmountMin) {
    try {
      const toAmount = BigInt(route.toAmount);
      const toAmountMin = BigInt(route.toAmountMin);
      
      if (toAmountMin > toAmount) {
        errors.push('toAmountMin cannot be greater than toAmount');
      }
      
      // Calculate slippage
      const slippagePercent = Number((toAmount - toAmountMin) * 100n / toAmount);
      if (slippagePercent > 50) {
        warnings.push(`Very high slippage: ${slippagePercent.toFixed(2)}%`);
      }
    } catch (error) {
      errors.push(`Error comparing amounts: ${error.message}`);
    }
  }
  
  // === STEPS VALIDATION ===
  if (Array.isArray(route.steps)) {
    if (route.steps.length === 0) {
      errors.push('Route has no steps');
    }
    
    route.steps.forEach((step, index) => {
      if (!step || typeof step !== 'object') {
        errors.push(`Step ${index} is invalid`);
        return;
      }
      
      // Required step fields
      const stepRequiredFields = ['id', 'type', 'tool', 'action', 'estimate'];
      stepRequiredFields.forEach(field => {
        if (!(field in step)) {
          errors.push(`Step ${index} missing field: ${field}`);
        }
      });
      
      // Action validation
      if (step.action) {
        const actionRequiredFields = ['fromToken', 'toToken', 'fromAmount'];
        actionRequiredFields.forEach(field => {
          if (!(field in step.action)) {
            errors.push(`Step ${index} action missing field: ${field}`);
          }
        });
      }
      
      // Estimate validation
      if (step.estimate) {
        if (!step.estimate.toAmount && !step.estimate.toAmountMin) {
          warnings.push(`Step ${index} estimate missing amount fields`);
        }
        
        // Check for gas costs
        if (!step.estimate.gasCosts || step.estimate.gasCosts.length === 0) {
          warnings.push(`Step ${index} has no gas cost estimate`);
        }
      }
    });
  }
  
  // === USD VALUES ===
  const usdFields = ['toAmountUSD', 'fromAmountUSD', 'gasCostUSD'];
  usdFields.forEach(field => {
    if (route[field]) {
      const value = parseFloat(route[field]);
      if (isNaN(value)) {
        errors.push(`${field} is not a valid number: ${route[field]}`);
      } else if (value < 0) {
        errors.push(`${field} cannot be negative: ${value}`);
      }
    }
  });
  
  // === TOKEN VALIDATION ===
  if (route.toToken && route.toToken.decimals === undefined) {
    errors.push('toToken missing decimals field');
  }
  if (route.fromToken && route.fromToken.decimals === undefined) {
    errors.push('fromToken missing decimals field');
  }
  
  // === PRICE IMPACT ===
  if (route.steps?.[0]?.estimate?.priceImpact !== undefined) {
    const priceImpact = parseFloat(route.steps[0].estimate.priceImpact);
    if (priceImpact > 0.1) { // > 10%
      warnings.push(`High price impact: ${(priceImpact * 100).toFixed(2)}%`);
    }
  }
  
  const isValid = errors.length === 0;
  
  // === LOGGING ===
  if (!isValid && process.env.NODE_ENV === 'development') {
    console.error('[Route Validation] Invalid route:', {
      route,
      errors,
      warnings
    });
  } else if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[Route Validation] Route warnings:', {
      warnings,
      route: route.id || 'unknown'
    });
  }
  
  return { isValid, errors, warnings };
};

/**
 * Validates an array of routes and returns only valid ones
 * @param {Array} routes - Array of routes to validate
 * @param {Object} options - Validation options
 * @returns {Object} - { validRoutes, invalidCount, warnings }
 */
export const validateRoutes = (routes, options = {}) => {
  if (!Array.isArray(routes)) {
    console.error('[Route Validation] routes must be an array, got:', typeof routes);
    return { validRoutes: [], invalidCount: 0, warnings: [] };
  }
  
  const results = routes.map(route => ({
    route,
    validation: validateRoute(route, options)
  }));
  
  const validRoutes = results
    .filter(r => r.validation.isValid)
    .map(r => r.route);
  
  const invalidCount = results.filter(r => !r.validation.isValid).length;
  
  const allWarnings = results.flatMap(r => r.validation.warnings);
  
  // Log summary
  if (process.env.NODE_ENV === 'development') {
    console.log('[Route Validation] Summary:', {
      total: routes.length,
      valid: validRoutes.length,
      invalid: invalidCount,
      warningCount: allWarnings.length
    });
    
    // Log first invalid route for debugging
    const firstInvalid = results.find(r => !r.validation.isValid);
    if (firstInvalid) {
      console.error('[Route Validation] First invalid route:', {
        route: firstInvalid.route,
        errors: firstInvalid.validation.errors
      });
    }
  }
  
  return {
    validRoutes,
    invalidCount,
    warnings: [...new Set(allWarnings)] // Remove duplicates
  };
};

/**
 * React hook for validating routes with state management
 * @param {Array} routes - Routes to validate
 * @returns {Object} - { validRoutes, invalidCount, warnings, hasWarnings, hasErrors }
 */
export const useRouteValidation = (routes) => {
  const [validationResult, setValidationResult] = useState({
    validRoutes: [],
    invalidCount: 0,
    warnings: [],
    hasWarnings: false,
    hasErrors: false
  });
  
  useEffect(() => {
    if (!routes || routes.length === 0) {
      setValidationResult({
        validRoutes: [],
        invalidCount: 0,
        warnings: [],
        hasWarnings: false,
        hasErrors: false
      });
      return;
    }
    
    const { validRoutes, invalidCount, warnings } = validateRoutes(routes);
    
    setValidationResult({
      validRoutes,
      invalidCount,
      warnings,
      hasWarnings: warnings.length > 0,
      hasErrors: invalidCount > 0
    });
  }, [routes]);
  
  return validationResult;
};

/**
 * UI Component: Validation Error Display
 */
export const RouteValidationErrors = ({ validationResult }) => {
  if (!validationResult || !validationResult.errors || validationResult.errors.length === 0) {
    return null;
  }
  
  return (
    <div className="route-validation-errors" style={{
      background: 'rgba(255, 82, 82, 0.1)',
      border: '1px solid #FF5252',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '12px'
    }}>
      <div style={{ fontWeight: 600, color: '#FF5252', marginBottom: '8px' }}>
        ⚠️ Route Validation Failed
      </div>
      <ul style={{ margin: 0, paddingLeft: '20px', color: '#FF5252' }}>
        {validationResult.errors.map((error, index) => (
          <li key={index} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
            {error}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * UI Component: Validation Warnings Display
 */
export const RouteValidationWarnings = ({ validationResult }) => {
  if (!validationResult || !validationResult.warnings || validationResult.warnings.length === 0) {
    return null;
  }
  
  return (
    <div className="route-validation-warnings" style={{
      background: 'rgba(255, 193, 7, 0.1)',
      border: '1px solid #FFC107',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '12px'
    }}>
      <div style={{ fontWeight: 600, color: '#FFC107', marginBottom: '8px' }}>
        ⚠️ Route Warnings
      </div>
      <ul style={{ margin: 0, paddingLeft: '20px', color: '#FFC107' }}>
        {validationResult.warnings.map((warning, index) => (
          <li key={index} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
            {warning}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default {
  validateRoute,
  validateRoutes,
  useRouteValidation,
  RouteValidationErrors,
  RouteValidationWarnings
};
