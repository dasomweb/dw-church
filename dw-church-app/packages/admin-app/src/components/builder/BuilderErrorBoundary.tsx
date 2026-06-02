import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Stops PageBuilder render errors from blanking the whole admin SPA.
 *
 * Without this, any throw inside LivePreviewPane / BlockRenderer /
 * ElementInspector — or in any storefront block component the
 * preview mounts — propagates up past the Suspense fallback and
 * leaves the user staring at a blank page with no clue what failed.
 *
 * The fallback prints the error message + a "다시 시도" button so the
 * operator can recover without reloading the whole admin tab. Errors
 * are also `console.error`'d for browser-devtools triage.
 */
interface Props {
  /** Short human label that names what crashed — shown in the header. */
  label: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class BuilderErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[builder] ${this.props.label} crashed`, error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="m-4 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-900">
          <div className="font-semibold mb-1">
            {this.props.label} 렌더 오류
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all opacity-80 mb-2">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={this.reset}
            className="px-2.5 py-1 text-xs bg-white border border-red-300 rounded hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
