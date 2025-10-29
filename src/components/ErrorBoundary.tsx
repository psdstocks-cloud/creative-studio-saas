import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

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
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-rose-400">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page or contact support if
                the issue persists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4">
                  <p className="font-mono text-sm text-rose-200">{this.state.error.toString()}</p>
                </div>
              )}
              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="rounded-lg border border-slate-700 bg-slate-950 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-300">
                    Stack trace (development only)
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs text-slate-400">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
                <Button variant="outline" onClick={this.handleReset}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
