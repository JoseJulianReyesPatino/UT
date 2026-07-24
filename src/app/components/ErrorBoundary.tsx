import React from "react";
import formNotFound from "../../assets/elementos/Form_Not_Found.webp";

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground px-4">
          <img
            src={formNotFound}
            alt="Error"
            className="w-64 max-w-full select-none"
            draggable={false}
          />
          <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">
            ¡Ups! Hubo un problema.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-md"
          >
            Recargar sección
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
