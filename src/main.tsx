import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource-variable/dm-sans";
import "./styles/index.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "whenly could not open its local data",
      error,
      info.componentStack,
    );
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <span className="brand">
          whenly<span>.</span>
        </span>
        <h1>A little trouble opening your memories.</h1>
        <p>
          Browser storage may be unavailable or full. Enable site storage and
          reload to try again. Your existing data hasn’t been intentionally
          changed.
        </p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
