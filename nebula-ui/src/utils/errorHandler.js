/**
 * Li.Fi Error Handling Utility
 * Handles all Li.Fi API error codes and provides user-friendly messages
 */

/**
 * @typedef {Object} LiFiError
 * @property {number} code - Li.Fi error code
 * @property {string} message - Error message
 * @property {Array<ToolError>} [errors] - Tool-specific errors
 */

/**
 * @typedef {Object} ToolError
 * @property {'NO_QUOTE'} errorType
 * @property {string} code - Specific error code
 * @property {string} tool - Tool name
 * @property {string} message - Error message
 */

// Li.Fi API Error Codes
export const LIFI_ERROR_CODES = {
  DEFAULT_ERROR: 1000,
  FAILED_TO_BUILD_TRANSACTION: 1001,
  NO_QUOTE: 1002,
  NOT_FOUND: 1003,
  NOT_PROCESSABLE: 1004,
  RATE_LIMIT: 1005,
  SERVER_ERROR: 1006,
  SLIPPAGE_ERROR: 1007,
  THIRD_PARTY_ERROR: 1008,
  TIMEOUT_ERROR: 1009,
  UNAUTHORIZED: 1010,
  VALIDATION_ERROR: 1011,
  RPC_FAILURE: 1012,
  MALFORMED_SCHEMA: 1013,
};

// Tool Error Codes
export const TOOL_ERROR_CODES = {
  NO_POSSIBLE_ROUTE: 'NO_POSSIBLE_ROUTE',
  INSUFFICIENT_LIQUIDITY: 'INSUFFICIENT_LIQUIDITY',
  TOOL_TIMEOUT: 'TOOL_TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  RPC_ERROR: 'RPC_ERROR',
  AMOUNT_TOO_LOW: 'AMOUNT_TOO_LOW',
  AMOUNT_TOO_HIGH: 'AMOUNT_TOO_HIGH',
  FEES_HIGHER_THAN_AMOUNT: 'FEES_HIGHER_THAN_AMOUNT',
  DIFFERENT_RECIPIENT_NOT_SUPPORTED: 'DIFFERENT_RECIPIENT_NOT_SUPPORTED',
  TOOL_SPECIFIC_ERROR: 'TOOL_SPECIFIC_ERROR',
  CANNOT_GUARANTEE_MIN_AMOUNT: 'CANNOT_GUARANTEE_MIN_AMOUNT',
};

/**
 * Get user-friendly error message from Li.Fi error code
 * @param {number} errorCode - Li.Fi error code
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case LIFI_ERROR_CODES.NO_QUOTE:
      return 'No routes available for this swap. Try adjusting the amount or selecting different tokens.';
    
    case LIFI_ERROR_CODES.INSUFFICIENT_LIQUIDITY:
      return 'Insufficient liquidity for this swap. Try a smaller amount or different tokens.';
    
    case LIFI_ERROR_CODES.SLIPPAGE_ERROR:
      return 'Slippage tolerance exceeded. Try increasing your slippage tolerance.';
    
    case LIFI_ERROR_CODES.RATE_LIMIT:
      return 'Too many requests. Please wait a moment and try again.';
    
    case LIFI_ERROR_CODES.TIMEOUT_ERROR:
      return 'Request timed out. Please check your connection and try again.';
    
    case LIFI_ERROR_CODES.FAILED_TO_BUILD_TRANSACTION:
      return 'Failed to build transaction. Please try again or contact support.';
    
    case LIFI_ERROR_CODES.VALIDATION_ERROR:
      return 'Invalid request parameters. Please check your input.';
    
    case LIFI_ERROR_CODES.RPC_FAILURE:
      return 'Blockchain RPC error. Please try again later.';
    
    case LIFI_ERROR_CODES.SERVER_ERROR:
      return 'Server error. Please try again later.';
    
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Get user-friendly message from tool error code
 * @param {string} toolErrorCode - Tool error code
 * @returns {string} User-friendly error message
 */
export const getToolErrorMessage = (toolErrorCode) => {
  switch (toolErrorCode) {
    case TOOL_ERROR_CODES.NO_POSSIBLE_ROUTE:
      return 'No route found for this swap.';
    
    case TOOL_ERROR_CODES.INSUFFICIENT_LIQUIDITY:
      return 'Insufficient liquidity available.';
    
    case TOOL_ERROR_CODES.TOOL_TIMEOUT:
      return 'Exchange timed out. Try again.';
    
    case TOOL_ERROR_CODES.AMOUNT_TOO_LOW:
      return 'Amount too low for this route.';
    
    case TOOL_ERROR_CODES.AMOUNT_TOO_HIGH:
      return 'Amount too high for this route.';
    
    case TOOL_ERROR_CODES.FEES_HIGHER_THAN_AMOUNT:
      return 'Fees exceed the swap amount.';
    
    case TOOL_ERROR_CODES.RPC_ERROR:
      return 'Blockchain data unavailable. Try again.';
    
    default:
      return 'Exchange error occurred.';
  }
};

/**
 * Parse Li.Fi API error response
 * @param {any} error - Error from API call
 * @returns {{code: number, message: string, toolErrors?: Array<{tool: string, message: string}>}}
 */
export const parseApiError = (error) => {
  // Handle network errors
  // Safely check for message existence and ensure it's a string
  const errorMessage = error?.message ? String(error.message) : '';
  
  if (!error?.response && errorMessage) {
    // Check for specific fetch failures
    const isCORS = errorMessage.includes('Failed to fetch') || errorMessage.includes('Network request failed');
    const detail = error.cause ? ` (${error.cause})` : '';
    
    return {
      code: LIFI_ERROR_CODES.TIMEOUT_ERROR,
      message: errorMessage.includes('timeout') 
        ? 'Request timed out. Please try again.'
        : `Network Error: ${errorMessage}${detail}`,
    };
  }

  // Handle Li.Fi API errors
  if (error.response?.data) {
    const { code, message, errors } = error.response.data;
    
    // Parse tool errors if present
    const toolErrors = errors?.map(toolError => ({
      tool: toolError.tool,
      code: toolError.code,
      message: getToolErrorMessage(toolError.code),
    }));

    return {
      code: code || LIFI_ERROR_CODES.DEFAULT_ERROR,
      message: message || getErrorMessage(code),
      toolErrors,
    };
  }

  // Fallback for unknown errors
  return {
    code: LIFI_ERROR_CODES.DEFAULT_ERROR,
    message: error.message || 'An unexpected error occurred.',
  };
};

/**
 * Format error for display to user
 * @param {any} error - Error object
 * @returns {{title: string, message: string, details?: string}}
 */
export const formatErrorForDisplay = (error) => {
  const parsedError = parseApiError(error);
  
  // Build detailed message with tool errors
  let details = '';
  if (parsedError.toolErrors && parsedError.toolErrors.length > 0) {
    details = parsedError.toolErrors
      .map(te => `${te.tool}: ${te.message}`)
      .join('\n');
  }

  return {
    title: 'Swap Error',
    message: parsedError.message,
    details: details || undefined,
  };
};

/**
 * Check if error is recoverable (user can retry)
 * @param {number} errorCode - Li.Fi error code
 * @returns {boolean}
 */
export const isRecoverableError = (errorCode) => {
  return [
    LIFI_ERROR_CODES.TIMEOUT_ERROR,
    LIFI_ERROR_CODES.RATE_LIMIT,
    LIFI_ERROR_CODES.SERVER_ERROR,
    LIFI_ERROR_CODES.RPC_FAILURE,
  ].includes(errorCode);
};

/**
 * ✅ HIGH #6: Parse blockchain transaction errors with enhanced context
 * @param {any} error - Error from wallet/transaction
 * @param {Object} context - Transaction context (route, token, etc.)
 * @returns {{title: string, message: string, suggestion?: string, recoverable: boolean}}
 */
export const parseTransactionError = (error, context = {}) => {
  const errorMessage = (error?.message || error?.reason || String(error)).toLowerCase();
  
  // User rejected transaction
  if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      suggestion: 'Click "Swap" to try again when ready.',
      recoverable: true
    };
  }
  
  // Insufficient funds
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
    const nativeSymbol = context.chain?.nativeCurrency?.symbol || 'native tokens';
    return {
      title: 'Insufficient Funds',
      message: `Not enough ${nativeSymbol} for transaction and gas.`,
      suggestion: `Add more ${nativeSymbol} or reduce the swap amount.`,
      recoverable: true
    };
  }
  
  // Nonce too low
  if (errorMessage.includes('nonce too low')) {
    return {
      title: 'Transaction Conflict',
      message: 'Pending transaction detected.',
      suggestion: 'Wait for pending transaction or speed it up in wallet.',
      recoverable: true
    };
  }
  
  // Gas issues
  if (errorMessage.includes('gas required exceeds') || errorMessage.includes('out of gas')) {
    return {
      title: 'Gas Estimation Failed',
      message: 'Transaction would fail due to gas limits.',
      suggestion: 'Try a smaller amount or refresh the quote.',
      recoverable: true
    };
  }
  
  // Execution reverted
  if (errorMessage.includes('execution reverted') || errorMessage.includes('revert')) {
    if (errorMessage.includes('expired') || errorMessage.includes('deadline')) {
      return {
        title: 'Quote Expired',
        message: 'Quote expired before execution.',
        suggestion: 'Refresh and try again quickly.',
        recoverable: true
      };
    }
    if (errorMessage.includes('slippage')) {
      return {
        title: 'Slippage Too Low',
        message: 'Price moved beyond slippage tolerance.',
        suggestion: 'Increase slippage in settings.',
        recoverable: true
      };
    }
    return {
      title: 'Transaction Failed',
      message: 'Contract rejected the transaction.',
      suggestion: 'Try smaller amount or different route.',
      recoverable: true
    };
  }
  
  // Network/RPC errors
  if (errorMessage.includes('network') || errorMessage.includes('rpc') || errorMessage.includes('timeout')) {
    return {
      title: 'Network Error',
      message: 'Could not connect to blockchain.',
      suggestion: 'Check connection and try again.',
      recoverable: true
    };
  }
  
  // Default fallback
  return {
    title: 'Transaction Error',
    message: error?.shortMessage || error?.message || 'An unexpected error occurred.',
    suggestion: 'Please try again or contact support.',
    recoverable: true
  };
};
