import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    // try reloading route as a simple recovery strategy
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-semibold mb-2">Terjadi kesalahan</h2>
          <p className="text-muted-foreground mb-6">Maaf, ada masalah saat memuat halaman ini.</p>
          <Button onClick={this.handleRetry}>Muat ulang</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
