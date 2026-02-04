/**
 * Environment Variable Validation
 * Ensures all required env vars are present at startup
 */

export const ENV = {
  // Required
  BACKEND_API_URL: import.meta.env.VITE_BACKEND_API_URL,
  WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  
  // Optional
  ENABLE_MEV_PROTECTION: import.meta.env.VITE_ENABLE_MEV_PROTECTION === 'true',
  ENABLE_SWAP_HISTORY: import.meta.env.VITE_ENABLE_SWAP_HISTORY === 'true',
  
  // Analytics
  MIXPANEL_TOKEN: import.meta.env.VITE_MIXPANEL_TOKEN,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  
  // Build info
  MODE: import.meta.env.MODE,
  IS_PROD: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,
};

/**
 * Validate environment variables
 * @throws {Error} if required vars are missing
 */
export function validateEnvironment() {
  const errors = [];
  
  // Production requirements
  if (ENV.IS_PROD) {
    if (!ENV.BACKEND_API_URL) {
      errors.push('VITE_BACKEND_API_URL is required in production');
    }
    
    if (!ENV.WALLETCONNECT_PROJECT_ID) {
      errors.push('VITE_WALLETCONNECT_PROJECT_ID is required');
    }
  }
  
  // Development warnings
  if (ENV.IS_DEV) {
    if (!ENV.BACKEND_API_URL) {
      console.warn('⚠️ VITE_BACKEND_API_URL not set - using direct API (insecure)');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(
      '❌ Environment Configuration Error:\n' +
      errors.map(e => `  - ${e}`).join('\n') +
      '\n\nPlease check your .env file.'
    );
  }
  
  console.log('✅ Environment validation passed');
}

export default ENV;
