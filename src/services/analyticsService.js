/**
 * Analytics Service
 * Centralized handling for user event tracking
 */

class AnalyticsService {
  constructor() {
    this.initialized = false;
    // Initialize external services here (e.g., GA, Mixpanel, Amplitude)
    this.init();
  }

  init() {
    // Check for environment variables or config
    // if (import.meta.env.VITE_ANALYTICS_ID) { ... }
    console.log('📊 Analytics Service Initialized');
    this.initialized = true;
  }

  /**
   * Track specific events
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Additional data
   */
  track(eventName, properties = {}) {
    if (!this.initialized) return;

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group(`📊 Track: ${eventName}`);
      console.log(properties);
      console.groupEnd();
    }

    // Send to actual analytics services
    try {
      // Option 1: Google Analytics 4
      if (window.gtag) {
        window.gtag('event', eventName, properties);
      }
      
      // Option 2: Mixpanel
      if (window.mixpanel) {
        window.mixpanel.track(eventName, properties);
      }
      
      // Option 3: PostHog
      if (window.posthog) {
        window.posthog.capture(eventName, properties);
      }
      
      // Option 4: Custom backend endpoint
      if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
        fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            event: eventName, 
            properties,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.warn('Analytics POST failed:', err));
      }
    } catch (error) {
      console.warn('Analytics error:', error);
      // Don't throw - analytics should never break the app
    }
  }

  /**
   * Track Swap Initiation
   * @param {Object} route - The selected route object
   */
  trackSwap(route) {
    if (!route) return;

    this.track('Swap Initiated', {
      fromChainId: route.fromChainId,
      toChainId: route.toChainId,
      fromToken: route.action?.fromToken?.symbol,
      toToken: route.action?.toToken?.symbol,
      amountUSD: route.fromAmountUSD,
      provider: route.tool,
      gasCostUSD: route.gasCostUSD
    });
  }

  /**
   * Track Wallet Connection
   * @param {string} walletName 
   */
  trackConnect(walletName) {
    this.track('Wallet Connected', { wallet: walletName });
  }

  /**
   * Track Errors
   * @param {string} context 
   * @param {Error} error 
   */
  trackError(context, error) {
    this.track('Error Occurred', { 
      context, 
      message: error.message || String(error) 
    });
  }
}

export const analytics = new AnalyticsService();
export default analytics;
