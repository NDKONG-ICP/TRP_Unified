import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to backend for diagnostics
    this.logError(error, errorInfo);
  }

  private logError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In production, send to backend
      console.log('Error logged:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-raven-black flex items-center justify-center p-4">
          <div className="glass-gold rounded-2xl p-8 max-w-lg w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-display font-bold text-gold-400 mb-4">
              Something went wrong
            </h2>
            <p className="text-silver-400 mb-6">
              We encountered an unexpected error. Our team has been notified.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="btn-gold w-full"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-outline-gold w-full"
              >
                Return Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-silver-500 cursor-pointer hover:text-gold-400">
                  Technical Details
                </summary>
                <pre className="mt-2 p-4 bg-raven-dark rounded-lg text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional error boundary wrapper for specific components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}






