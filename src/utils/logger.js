/**
 * Logger Utility
 * Prevents console logs from leaking to production
 * while maintaining full debugging capabilities in development.
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Log informational messages (dev only)
     */
    log: (...args) => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Log debug messages with context (dev only)
     */
    debug: (...args) => {
        if (isDev) {
            console.debug('🔍', ...args);
        }
    },

    /**
     * Log warnings (dev only, but can be enabled for prod monitoring)
     */
    warn: (...args) => {
        if (isDev) {
            console.warn(...args);
        }
    },

    /**
     * Log errors - ALWAYS logs (errors are critical)
     * Optionally sends to Sentry in production
     */
    error: (...args) => {
        console.error(...args);
        
        // Send to Sentry in production
        if (!isDev && window.Sentry) {
            try {
                const message = args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ');
                window.Sentry.captureMessage(message, 'error');
            } catch (e) {
                // Sentry failed, don't block execution
            }
        }
    },

    /**
     * Log success messages (dev only)
     */
    success: (...args) => {
        if (isDev) {
            console.log('✅', ...args);
        }
    },

    /**
     * Performance timing (dev only)
     */
    time: (label) => {
        if (isDev) {
            console.time(label);
        }
    },

    timeEnd: (label) => {
        if (isDev) {
            console.timeEnd(label);
        }
    },

    /**
     * Group logs (dev only)
     */
    group: (label) => {
        if (isDev) {
            console.group(label);
        }
    },

    groupEnd: () => {
        if (isDev) {
            console.groupEnd();
        }
    }
};

export default logger;
