import { Component, type ErrorInfo, type ReactNode } from "react";
import { AccessDenied } from "./auth-screens";

export class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard rendering failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <AccessDenied
          title="Dashboard could not load"
          message="Your sign-in succeeded, but the dashboard encountered an error. Reload to try again, or sign out."
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
