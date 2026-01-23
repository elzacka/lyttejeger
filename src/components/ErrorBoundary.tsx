import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle as WarningIcon, RefreshCw as RefreshIcon } from 'lucide-react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Name shown in error message, e.g. "søkevisningen" */
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback with retry button
      return (
        <div className={styles.container} role="alert">
          <WarningIcon size={48} className={styles.icon} aria-hidden="true" />
          <h2 className={styles.title}>Noe gikk galt</h2>
          <p className={styles.message}>
            {this.props.viewName
              ? `Det oppstod en feil i ${this.props.viewName}.`
              : 'Det oppstod en uventet feil.'}
          </p>
          <button className={styles.retryButton} onClick={this.handleRetry}>
            <RefreshIcon size={18} aria-hidden="true" />
            Prøv igjen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
