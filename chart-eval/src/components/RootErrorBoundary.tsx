import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Surfaces React render / lazy-import failures instead of a blank screen (e.g. on GitHub Pages).
 */
export class RootErrorBoundary extends Component<Props, State> {
  public state: State = { error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("RootErrorBoundary:", error, info.componentStack);
  }

  public render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          className="app-shell"
          style={{ padding: "1.25rem", maxWidth: "720px", margin: "0 auto" }}
        >
          <div className="chart-card">
            <h2 style={{ marginTop: 0 }}>This page hit a runtime error</h2>
            <p className="hint">
              Open the browser developer console (F12) for full details. Common causes on
              GitHub Pages: a failed network request for a JavaScript chunk (404), or a
              missing browser polyfill.
            </p>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "0.85rem",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "var(--surface, #f5f5f7)",
                border: "1px solid var(--border, #d2d2d7)",
              }}
            >
              {this.state.error.message}
            </pre>
            {this.state.error.stack ? (
              <pre
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.75rem",
                  opacity: 0.85,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.stack}
              </pre>
            ) : null}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
