import { Component } from "react";
import { RefreshCw } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-panel flex min-h-[12rem] flex-col items-center justify-center gap-4 rounded-[1.85rem] p-8 text-center">
          <p className="text-base font-bold text-[color:var(--ink)]">
            {this.props.title ?? "이 섹션을 불러오지 못했어요"}
          </p>
          <p className="text-sm text-[color:var(--ink-soft)]">
            {this.props.description ?? "잠시 후 다시 시도해주세요."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="app-secondary-button flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} strokeWidth={2.4} />
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
