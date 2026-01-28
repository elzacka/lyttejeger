/**
 * Error Boundary component for graceful error handling
 * Catches JavaScript errors in child component tree
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Display name for the view (used in error messages) */
  viewName?: string;
  /** Fallback UI to show on error */
  fallback?: ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Reset key - when changed, resets the error state */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      // Default error UI with viewName
      const viewName = this.props.viewName;
      return (
        <div className="error-view" role="alert">
          <p>
            {viewName
              ? `Beklager, noe gikk galt i ${viewName}.`
              : 'Beklager, noe gikk galt.'}
          </p>
          <p>Prøv å laste siden på nytt.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Portal-specific error boundary that silently fails
 * Use this to wrap portal content to prevent crashes
 */
export function PortalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={null}>
      {children}
    </ErrorBoundary>
  );
}
