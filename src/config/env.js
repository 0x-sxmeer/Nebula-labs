/**
 * Environment Variable Validation
 * ensuring critical keys exist and secrets are not leaked to the client bundle.
 */

export const validateEnvVars = () => {
    // 1. Check for required variables
    const required = {
      // VITE_WALLETCONNECT_PROJECT_ID is needed for RainbowKit/Wagmi
      VITE_WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    };
  
    const missing = Object.entries(required)
      .filter(([key, value]) => !value || value.includes('your_') || value.includes('_here'))
      .map(([key]) => key);
  
    if (missing.length > 0) {
      // In production, this is critical. In dev, we might warn.
      const msg = `Missing or invalid environment variables: ${missing.join(', ')}.\nPlease configure these in your .env file.`;
      
      if (import.meta.env.PROD) {
          throw new Error(msg);
      } else {
          console.warn('⚠️ ' + msg);
      }
    }
  
    // 2. Security Check: Ensure no server-only keys leak to client
    const forbidden = ['LIFI_API_KEY', 'ALCHEMY_API_KEY', 'PRIVATE_KEY', 'MNEMONIC'];
    const leaked = [];
    
    forbidden.forEach(key => {
      // Check if the key exists in the accessible env (Vite exposes only VITE_ prefixed vars by default, 
      // but sometimes users mess up config)
      if (import.meta.env[key] || process?.env?.[key]) {
        leaked.push(key);
      }
    });
    
    if (leaked.length > 0) {
        throw new Error(
          `SECURITY ERROR: ${leaked.join(', ')} exposed to client bundle! ` +
          'These keys should only exist in backend environment variables.'
        );
    }
    
    console.log('✅ Environment variables validated');
  };
