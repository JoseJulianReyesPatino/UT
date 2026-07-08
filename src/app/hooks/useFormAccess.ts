import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface FormAccess {
  isLoading: boolean;
  dueAt: string | null;
  isExpired: boolean;
  canSubmit: boolean;
}

export function useFormAccess(formId: number): FormAccess {
  const [state, setState] = useState<FormAccess>({
    isLoading: true,
    dueAt: null,
    isExpired: false,
    canSubmit: true,
  });

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
    const intervalId = window.setInterval(check, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [formId]);

  return state;
}
