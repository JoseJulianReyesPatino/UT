
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
  import "./styles/index.css";

  // Parche: Google Translate envuelve nodos de texto en <font>, lo que rompe
  // el reconciliador de React al navegar. En lugar de lanzar un error fatal
  // que bloquea la app, ignoramos silenciosamente la operación inválida.
  if (typeof Node === "function" && Node.prototype) {
    const _removeChild = Node.prototype.removeChild;
    // @ts-expect-error — parche intencional para compatibilidad con Google Translate
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) return child;
      return _removeChild.call(this, child) as T;
    };

    const _insertBefore = Node.prototype.insertBefore;
    // @ts-expect-error — parche intencional para compatibilidad con Google Translate
    Node.prototype.insertBefore = function <T extends Node>(newNode: T, ref: Node | null): T {
      if (ref && ref.parentNode !== this) return newNode;
      return _insertBefore.call(this, newNode, ref) as T;
    };
  }

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  