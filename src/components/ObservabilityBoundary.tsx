import React from 'react';
import { reportClientError } from '../services/observabilityService';

interface ObservabilityBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ObservabilityBoundaryState {
  hasError: boolean;
}

export class ObservabilityBoundary extends React.Component<
  ObservabilityBoundaryProps,
  ObservabilityBoundaryState
> {
  state: ObservabilityBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ObservabilityBoundaryState {
    return { hasError: true };
  }

  async componentDidCatch(error: unknown, info: React.ErrorInfo) {
    await reportClientError(error, info);
  }

  resetError = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="h-screen w-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8"
        >
          <div className="max-w-md text-center space-y-4">
            {this.props.fallback}
            <button
              type="button"
              onClick={this.resetError}
              className="mt-4 rounded bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
