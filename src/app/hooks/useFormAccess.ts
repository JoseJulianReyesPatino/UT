import { useEffect, useLayoutEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface FormAccess {
  isLoading: boolean;
  dueAt: string | null;
  isExpired: boolean;
  canSubmit: boolean;
}

const BC_CHANNEL = "form_config_changed";

export function useFormAccess(formId: number): FormAccess {
  const [state, setState] = useState<FormAccess>({
    isLoading: true,
    dueAt: null,
    isExpired: false,
    canSubmit: true,
  });

  // Reset synchronously before paint so no stale "closed" state flashes when formId changes
  useLayoutEffect(() => {
    setState({ isLoading: true, dueAt: null, isExpired: false, canSubmit: true });
  }, [formId]);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      apiFetch(`/forms/${formId}`)
        .then((res: any) => {
          if (cancelled) return;
          const form = res?.data ?? res;
          const dueAt: string | null = form?.due_at ?? null;
          const isExpired = dueAt !== null && new Date(dueAt) < new Date();
          setState({ isLoading: false, dueAt, isExpired, canSubmit: !isExpired });
        })
        .catch(() => {
          if (cancelled) return;
          setState((prev) => ({ ...prev, isLoading: false }));
        });
    };

    check();
    const intervalId = window.setInterval(check, 10_000);

    // Instantly sync when admin saves form config in another tab
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(BC_CHANNEL);
      bc.onmessage = (event: MessageEvent) => {
        if (event.data?.formId === formId) check();
      };
    }

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      bc?.close();
    };
  }, [formId]);

  return state;
}
