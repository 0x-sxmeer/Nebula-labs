import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    // Send to Sentry if configured
    if (window.Sentry) {
      window.Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: '#0f172a',
            color: 'white',
            fontFamily: 'sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f87171' }}>Something went wrong</h1>
          <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>The application encountered an unexpected error. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            Refresh Page
          </button>
          {import.meta.env.DEV && (
            <pre style={{ 
                textAlign: 'left', 
                background: '#1e293b', 
                color: '#ef4444',
                padding: '20px', 
                marginTop: '40px', 
                borderRadius: '12px',
                maxWidth: '800px',
                overflow: 'auto',
                fontSize: '0.8rem',
                border: '1px solid #334155'
            }}>
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
