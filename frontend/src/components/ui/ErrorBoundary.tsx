'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-error text-[48px]">
              error
            </span>
            <h2 className="text-headline-md font-headline-md text-primary mt-3">
              Algo salió mal
            </h2>
            <p className="text-body-md text-on-surface-variant mt-2">
              Ocurrió un error inesperado. Por favor, intenta nuevamente.
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-4 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity active:scale-95"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
