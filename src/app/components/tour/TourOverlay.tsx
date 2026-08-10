import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface TourStep {
  target: string;
  title: string;
  content: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  view?: string;
  image?: string;
}

interface Props {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
  onOpenMobileSidebar?: () => void;
  onCloseMobileSidebar?: () => void;
  onStepChange?: (step: TourStep) => void;
}

const GAP = 12;
const PAD = 8;
const MARGIN = 16;
const MOBILE_BP = 640;
const FALLBACK_H = 260;

function tooltipPos(
  rect: DOMRect,
  preferred: string,
  tw: number,
  th: number,
  extraRightMargin = 0,
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const clampX = (x: number) => Math.max(MARGIN, Math.min(x, vw - tw - MARGIN - extraRightMargin));
  const clampY = (y: number) => Math.max(MARGIN, Math.min(y, vh - th - MARGIN));

  const midX = rect.left + rect.width / 2;
  const midY = rect.top + rect.height / 2;

  const tryRight = (): React.CSSProperties | null => {
    const left = rect.right + GAP;
    if (left + tw + MARGIN + extraRightMargin <= vw) return { top: clampY(midY - th / 2), left };
    return null;
  };
  const tryLeft = (): React.CSSProperties | null => {
    const left = rect.left - GAP - tw;
    if (left >= MARGIN) return { top: clampY(midY - th / 2), left };
    return null;
  };
  const tryBottom = (): React.CSSProperties | null => {
    const top = rect.bottom + GAP;
    if (top >= MARGIN && top + th + MARGIN <= vh) return { top, left: clampX(midX - tw / 2) };
    return null;
  };
  const tryTop = (): React.CSSProperties | null => {
    const top = rect.top - GAP - th;
    if (top >= MARGIN && rect.top <= vh - MARGIN) return { top, left: clampX(midX - tw / 2) };
    return null;
  };

  const opposites: Record<string, string> = { right: "left", left: "right", top: "bottom", bottom: "top" };
  const fns: Record<string, () => React.CSSProperties | null> = {
    right: tryRight, left: tryLeft, top: tryTop, bottom: tryBottom,
  };

  const elemIsHuge = rect.width > vw * 0.6 || rect.height > vh * 0.5;
  if (elemIsHuge) {
    const pref = fns[preferred]?.();
    if (pref) return pref;
    const opp = fns[opposites[preferred] ?? "bottom"]?.();
    if (opp) return opp;
    return { top: clampY(vh / 2 - th / 2), left: clampX(vw / 2 - tw / 2) };
  }

  const order = [preferred, opposites[preferred] ?? "bottom", "bottom", "right", "top", "left"];
  for (const dir of order) {
    const result = fns[dir]?.();
    if (result) return result;
  }

  return { top: clampY(vh / 2 - th / 2), left: clampX(vw / 2 - tw / 2) };
}

function spotlightRect(rect: DOMRect) {
  const maxH = window.innerHeight - MARGIN * 2;
  const h = Math.min(rect.height, maxH);
  return { top: rect.top, left: rect.left, width: rect.width, height: h };
}

function findTourElement(target: string): Element | null {
  const all = document.querySelectorAll(`[data-tour="${target}"]`);
  for (const el of Array.from(all)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) return el;
  }
  return all[0] ?? null;
}

export function TourOverlay({ 
  steps, 
  isOpen, 
  onClose, 
  onNavigate, 
  onOpenMobileSidebar, 
  onCloseMobileSidebar,
  onStepChange 
}: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BP);
  const [tooltipH, setTooltipH] = useState(FALLBACK_H);
  const [spotReady, setSpotReady] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const prevViewRef = useRef<string | undefined>(undefined);
  const prevStepWasNavRef = useRef(false);
  // Refs to keep the latest prop/state values accessible inside effects without
  // adding them as dependencies (avoids cancelling the spotlight timeout on every
  // render caused by unstable prop references from the parent).
  const stepRef = useRef(step);
  const stepsRef = useRef(steps);
  const onCloseRef = useRef(onClose);
  const onNavigateRef = useRef(onNavigate);
  const onOpenMobileSidebarRef = useRef(onOpenMobileSidebar);
  const onCloseMobileSidebarRef = useRef(onCloseMobileSidebar);
  // Sync all refs on every render (no dep array = runs before effects each render)
  useEffect(() => {
    stepRef.current = step;
    stepsRef.current = steps;
    onCloseRef.current = onClose;
    onNavigateRef.current = onNavigate;
    onOpenMobileSidebarRef.current = onOpenMobileSidebar;
    onCloseMobileSidebarRef.current = onCloseMobileSidebar;
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        if (stepRef.current >= stepsRef.current.length - 1) onCloseRef.current?.();
        else setStep((s) => s + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      prevViewRef.current = undefined;
      prevStepWasNavRef.current = false;
      setSpotReady(false);
    } else {
      // Close the sidebar when the tour ends so it doesn't stay open on mobile
      if (window.innerWidth < MOBILE_BP) onCloseMobileSidebarRef.current?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const current = stepsRef.current[step];
    if (!current) return;

    if (onStepChange) {
      onStepChange(current);
    }

    const navigated = Boolean(current.view && current.view !== prevViewRef.current);
    if (navigated && onNavigateRef.current) {
      prevViewRef.current = current.view;
      setSpotReady(false); // hide everything while view transitions
      onNavigateRef.current(current.view!);
    }

    const isNavTarget = current.target.startsWith("nav-");
    const mobileVp = window.innerWidth < MOBILE_BP;
    const prevWasNav = prevStepWasNavRef.current;
    prevStepWasNavRef.current = isNavTarget;

    if (mobileVp) {
      if (isNavTarget) {
        // Open sidebar so the nav item is visible and spotlight-able
        onOpenMobileSidebarRef.current?.();
      } else {
        // Close sidebar so page content is visible for non-nav steps
        onCloseMobileSidebarRef.current?.();
      }
    }

    const delay = navigated ? 500
      : isNavTarget && mobileVp ? 350
      : prevWasNav && mobileVp ? 400
      : 120;

    const t = setTimeout(() => {
      const el = findTourElement(current.target);
      if (!el) { setRect(null); setSpotReady(false); return; }
      el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "nearest" });
      setRect(el.getBoundingClientRect());
      setSpotReady(true);
    }, delay);
    
    return () => clearTimeout(t);
  // Only re-run when step or open state change — callbacks and steps are accessed
  // via refs so their identity doesn't need to be a dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isOpen]);

  useLayoutEffect(() => {
    if (!tooltipRef.current || isMobile) return;
    const h = tooltipRef.current.offsetHeight;
    if (Math.abs(h - tooltipH) > 2) setTooltipH(h);
  }, [step, isOpen, isMobile, tooltipH]);

  if (!isOpen) return null;

  const current = steps[step];
  const placement = current.placement ?? "right";
  const tw = Math.min(320, window.innerWidth - MARGIN * 2);
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const spot = rect ? spotlightRect(rect) : null;

  const hasImage = !!current.image && !isMobile;
  const imageReserve = hasImage ? 128 : 0;

  const tooltipStyle: React.CSSProperties = isMobile
    ? { bottom: 0, left: 0, right: 0, width: "100%", maxHeight: "60vh", overflowY: "auto" }
    : rect
    ? { ...tooltipPos(rect, placement, tw, tooltipH, imageReserve), width: tw }
    : { top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: tw };

  const borderRadius = isMobile ? "20px 20px 0 0" : "16px";
  const tooltipOpacity = !rect || spotReady ? 1 : 0;

  const mascotPos = (() => {
    if (!hasImage) return null;
    const ts = tooltipStyle as { top?: unknown; left?: unknown };
    if (typeof ts.top !== "number" || typeof ts.left !== "number") return null;
    return { left: ts.left + tw + 44, top: ts.top + tooltipH / 2 };
  })();

  return (
    <>
      <style>{`
        @keyframes _tour-content-in {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes _tour-content-in-mobile {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {spot && (
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 9998,
            top: spot.top - PAD,
            left: spot.left - PAD,
            width: spot.width + PAD * 2,
            height: spot.height + PAD * 2,
            borderRadius: 12,
            opacity: spotReady ? 1 : 0,
            boxShadow:
              "0 0 0 9999px rgba(0,0,0,0.58)," +
              "0 0 0 2px #10b981," +
              "0 0 22px 6px rgba(16,185,129,0.4)",
            transition:
              "top 370ms cubic-bezier(0.4,0,0.2,1)," +
              "left 370ms cubic-bezier(0.4,0,0.2,1)," +
              "width 370ms cubic-bezier(0.4,0,0.2,1)," +
              "height 370ms cubic-bezier(0.4,0,0.2,1)," +
              "opacity 220ms ease",
          }}
        />
      )}

      <div className="fixed inset-0" style={{ zIndex: 9997 }} onClick={onClose} />

      <div
        ref={tooltipRef}
        className="fixed z-[10001] overflow-visible border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{
          ...tooltipStyle,
          borderRadius,
          opacity: tooltipOpacity,
          transition: rect
            ? "top 370ms cubic-bezier(0.4,0,0.2,1),left 370ms cubic-bezier(0.4,0,0.2,1),opacity 220ms ease"
            : "opacity 220ms ease",
          willChange: "top, left, opacity",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          key={step}
          style={{
            animation: isMobile
              ? "_tour-content-in-mobile 240ms cubic-bezier(0.4,0,0.2,1) both"
              : "_tour-content-in 240ms cubic-bezier(0.4,0,0.2,1) both",
          }}
        >
          {isMobile && (
            <div className="flex justify-center pt-3 pb-0.5">
              <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
          )}

          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {step + 1} de {steps.length}
            </span>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Cerrar tutorial"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="px-4 pb-3"
            style={hasImage ? { paddingRight: "2.75rem" } : undefined}
          >
            <h3 className="mb-1.5 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">
              {current.title}
            </h3>
            <div className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
              {current.content}
            </div>
          </div>

          <div className="mx-4 mb-3 h-1 rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-1 rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div
            className="flex items-center justify-between px-4 pb-4"
            style={isMobile ? { paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" } : undefined}
          >
            <button
              onClick={onClose}
              className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            >
              Omitir
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={isFirst}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Volver
              </button>
              <button
                onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
              >
                {isLast ? "Finalizar" : "Siguiente"}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mascotPos && (
        <div
          key={`img-${step}`}
          className="pointer-events-none fixed"
          style={{
            left: mascotPos.left,
            top: mascotPos.top,
            transform: "translate(-50%, -50%)",
            zIndex: 10002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: tooltipOpacity,
            transition: "opacity 220ms ease",
          }}
        >
          <div aria-hidden="true" style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: isLast ? "12rem" : "10rem",
            height: isLast ? "12rem" : "10rem",
            borderRadius: "50%",
            background: "rgba(16,185,129,0.04)",
            border: "1px solid rgba(16,185,129,0.15)",
            boxShadow: "0 0 22px 8px rgba(16,185,129,0.08)",
            zIndex: 1,
          }} />
          <div aria-hidden="true" style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: isLast ? "9.5rem" : "7.5rem",
            height: isLast ? "9.5rem" : "7.5rem",
            borderRadius: "50%",
            background: "rgba(16,185,129,0.08)",
            border: "1.5px solid rgba(16,185,129,0.28)",
            zIndex: 2,
          }} />
          <div aria-hidden="true" style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: isLast ? "6.5rem" : "5rem",
            height: isLast ? "6.5rem" : "5rem",
            borderRadius: "50%",
            background: "rgba(16,185,129,0.14)",
            border: "2px solid rgba(16,185,129,0.42)",
            zIndex: 3,
          }} />
          <img
            src={current.image}
            alt=""
            aria-hidden="true"
            className="object-contain drop-shadow-lg"
            style={{
              position: "relative",
              zIndex: 4,
              height: isLast ? "11rem" : "9.5rem",
              width: "auto",
              animation: "_tour-content-in 280ms cubic-bezier(0.4,0,0.2,1) both",
            }}
          />
        </div>
      )}
    </>
  );
}