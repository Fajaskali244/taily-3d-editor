import { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  msg?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(err: any): ErrorBoundaryState {
    return { hasError: true, msg: String(err) };
  }

  componentDidCatch(err: any, info: any) {
    console.error('Customize error:', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="p-6 text-center max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong loading the designer.</h2>
            <p className="text-sm text-muted-foreground mb-4">{this.state.msg}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}