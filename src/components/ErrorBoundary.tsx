import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl px-4 py-24 text-center" role="alert">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-bold uppercase text-[var(--night)]">
            Une erreur est survenue
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Une difficulté temporaire a empêché l'affichage de cette section.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--night)] px-6 font-semibold text-white shadow-md hover:bg-[var(--night-2)] transition"
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
