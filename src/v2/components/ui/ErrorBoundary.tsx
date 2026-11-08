'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Record Book V2 Error Boundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center text-slate-900">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-[#FFFBEB] text-amber-700">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">View Recovery Notice</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-600">
            An unexpected issue occurred while rendering this module.
          </p>
          <details className="mt-4 text-left max-w-sm text-[11px] text-slate-500">
            <summary className="cursor-pointer font-medium text-slate-700">Technical Details</summary>
            <pre className="mt-2 p-2 rounded bg-slate-100 overflow-auto max-h-40">
              {this.state.error?.message}
              {this.state.error?.stack}
            </pre>
          </details>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry View
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Full Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Layout-safe error boundary for Framer Motion layout issues
export class LayoutErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Specifically catch Framer Motion layout projection errors
    if (
      error.message.includes('isStepper') ||
      error.message.includes('layoutId') ||
      error.message.includes('Projection')
    ) {
      return { hasError: true, error };
    }
    return { hasError: false, error: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log layout projection errors, don't re-throw
    if (
      error.message.includes('isStepper') ||
      error.message.includes('layoutId') ||
      error.message.includes('Projection')
    ) {
      console.warn('Layout projection error caught (non-fatal):', error.message);
    } else {
      console.error('Record Book V2 Layout Error Boundary caught:', error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center text-slate-800">
          <p className="text-sm font-semibold">A view rendering issue occurred.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Retry View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}