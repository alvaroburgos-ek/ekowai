'use client';

import { Component, type ReactNode } from 'react';

type Props = {
  /** Shown in the fallback so the engineer knows which editor failed. */
  label: string;
  children: ReactNode;
};

type State = { error: Error | null };

/**
 * Contains a render error inside a single worksheet editor so a bug in one
 * structured editor can never blank the whole worksheet page (the "server
 * error occurred" digest failure mode). React error boundaries catch errors
 * both on the client and during SSR, so the surrounding form still renders.
 */
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">
          <div className="font-medium">{this.props.label} konnte nicht geladen werden.</div>
          <div className="text-xs mt-1 text-subtext break-words">
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
