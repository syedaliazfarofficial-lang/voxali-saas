import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl m-4">
            <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="w-8 h-8 text-red-500" />
                <h2 className="text-xl font-bold text-red-500">Component Crashed</h2>
            </div>
            <p className="text-white/70 mb-4 whitespace-pre-wrap font-mono text-sm">
                {this.state.error?.message}
            </p>
        </div>
      );
    }

    return this.props.children;
  }
}
