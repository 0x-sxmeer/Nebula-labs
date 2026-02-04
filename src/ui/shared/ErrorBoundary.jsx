/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app.
 */

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null,
            eventId: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }

        this.setState({ errorInfo });

        // Send to Sentry in production
        if (window.Sentry && !import.meta.env.DEV) {
            window.Sentry.withScope((scope) => {
                scope.setExtras(errorInfo);
                const eventId = window.Sentry.captureException(error);
                this.setState({ eventId });
            });
        }

        // Track in analytics
        if (window.posthog) {
            window.posthog.capture('error_boundary_triggered', {
                error: error.message,
                component: this.props.name || 'Unknown',
                stack: error.stack
            });
        }
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null 
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { error, eventId } = this.state;
            const isDev = import.meta.env.DEV;
            const componentName = this.props.name || 'Component';

            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <div className="error-icon">
                            <AlertTriangle size={48} />
                        </div>
                        
                        <h2 className="error-title">Something went wrong</h2>
                        <p className="error-message">
                            {this.props.message || `The ${componentName} encountered an unexpected error.`}
                        </p>

                        {/* Show error details in dev mode */}
                        {isDev && error && (
                            <div className="error-details">
                                <div className="error-details-header">
                                    <Bug size={14} />
                                    <span>Error Details (Dev Mode)</span>
                                </div>
                                <code className="error-code">
                                    {error.message}
                                </code>
                                {error.stack && (
                                    <pre className="error-stack">
                                        {error.stack.split('\n').slice(0, 5).join('\n')}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Sentry Event ID for support */}
                        {eventId && !isDev && (
                            <p className="error-event-id">
                                Error ID: <code>{eventId}</code>
                            </p>
                        )}

                        <div className="error-actions">
                            <button 
                                className="error-btn error-btn-primary"
                                onClick={this.handleReset}
                            >
                                <RefreshCw size={16} />
                                Try Again
                            </button>
                            <button 
                                className="error-btn error-btn-secondary"
                                onClick={this.handleReload}
                            >
                                Reload Page
                            </button>
                            <button 
                                className="error-btn error-btn-ghost"
                                onClick={this.handleGoHome}
                            >
                                <Home size={16} />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export const withErrorBoundary = (WrappedComponent, options = {}) => {
    const WithErrorBoundary = (props) => (
        <ErrorBoundary 
            name={options.name || WrappedComponent.displayName || WrappedComponent.name}
            fallback={options.fallback}
            message={options.message}
        >
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );

    WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
    
    return WithErrorBoundary;
};

export default ErrorBoundary;
