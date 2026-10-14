import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Check } from "lucide-react";

const OPERATORS = [
  { label: "+", char: "+" },
  { label: "−", char: "-" },
  { label: "×", char: "*" },
  { label: "÷", char: "/" },
  { label: "(", char: "(" },
  { label: ")", char: ")" },
];

const MATH_OPERATOR_CHARS = new Set(["+", "-", "*", "/"]);

const SLIDE_DURATION_MS = 250;

// ---------- Module-level store so InlineEdit can register step/save actions ----------
let _stepCb: ((delta: number) => void) | null = null;
let _saveCb: (() => void) | null = null;
let _suppressBlurCb: (() => void) | null = null;
// Set by step/save buttons so onFocusOut skips its hide timer for that one event.
let _suppressNextToolbarHide = false;
const _storeListeners = new Set<() => void>();

/** Call in a toolbar button's onTouchStart to keep the toolbar visible after the tap. */
export function suppressNextToolbarHide() {
  _suppressNextToolbarHide = true;
}

export function setInlineEditActions(
  onStep: ((delta: number) => void) | null,
  onSave: (() => void) | null,
  onSuppressBlur?: (() => void) | null
) {
  _stepCb = onStep;
  _saveCb = onSave;
  _suppressBlurCb = onSuppressBlur ?? null;
  _storeListeners.forEach((l) => l());
}

/**
 * Call from any external button's onTouchStart to prevent the currently-focused
 * inline-edit input's blur from cancelling the edit session.
 * Must be called synchronously in touchstart (before blur fires).
 */
export function suppressInlineEditBlur() {
  _suppressBlurCb?.();
}

function useInlineEditActions() {
  const [, setRev] = useState(0);
  useEffect(() => {
    const notify = () => setRev((r) => r + 1);
    _storeListeners.add(notify);
    return () => {
      _storeListeners.delete(notify);
    };
  }, []);
  return { stepCb: _stepCb, saveCb: _saveCb };
}
// --------------------------------------------------------------------------------------

export function MathKeyboardToolbar() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const { stepCb, saveCb } = useInlineEditActions();

  const isTouch =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isTouch) return;

    function onFocusIn(e: FocusEvent) {
      clearHideTimer();
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement && target.dataset.math) {
        activeInputRef.current = target;
        setMounted(true);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = requestAnimationFrame(() => {
            setVisible(true);
            // Scroll the input into view after the toolbar slides up
            requestAnimationFrame(() => {
              activeInputRef.current?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            });
          });
        });
      } else {
        activeInputRef.current = null;
        setVisible(false);
        unmountTimerRef.current = setTimeout(() => {
          setMounted(false);
        }, SLIDE_DURATION_MS + 50);
      }
    }

    function onFocusOut() {
      // A toolbar step/save button set this flag — skip the hide timer entirely.
      if (_suppressNextToolbarHide) {
        _suppressNextToolbarHide = false;
        return;
      }
      hideTimerRef.current = setTimeout(() => {
        activeInputRef.current = null;
        setVisible(false);
        unmountTimerRef.current = setTimeout(() => {
          setMounted(false);
        }, SLIDE_DURATION_MS + 50);
      }, 100);
    }

    function updatePosition() {
      if (!window.visualViewport) return;
      const vv = window.visualViewport;
      setBottomOffset(window.innerHeight - (vv.offsetTop + vv.height));
      // Re-scroll input into view whenever the keyboard resizes the viewport
      requestAnimationFrame(() => {
        activeInputRef.current?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      });
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
      clearHideTimer();
    };
  }, [isTouch, clearHideTimer]);

  const handleInsert = useCallback(
    (char: string) => {
      const input = activeInputRef.current;
      if (!input) return;
      clearHideTimer();
      input.focus();
      // For math operators: if the entire value is currently selected, move the
      // cursor to the end first so the operator appends instead of replacing.
      if (
        MATH_OPERATOR_CHARS.has(char) &&
        input.value.length > 0 &&
        input.selectionStart === 0 &&
        input.selectionEnd === input.value.length
      ) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
      document.execCommand("insertText", false, char);
    },
    [clearHideTimer]
  );

  const handleBackspace = useCallback(() => {
    const input = activeInputRef.current;
    if (!input) return;
    clearHideTimer();
    input.focus();
    document.execCommand("delete");
  }, [clearHideTimer]);

  if (!isTouch || !mounted || typeof document === "undefined") return null;

  const hasStepActions = stepCb !== null && saveCb !== null;

  return createPortal(
    <div
      data-math-toolbar="true"
      style={{
        bottom: `${bottomOffset}px`,
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0, 0, 0.2, 1)`,
      }}
      className="fixed left-0 right-0 z-[200] flex items-center gap-1.5 px-3 py-2 bg-card border-t border-border/80 shadow-[0_-4px_16px_rgba(0,0,0,0.5)]"
    >
      {/* Step −/+ buttons — only when an InlineEdit is active on a number field */}
      {hasStepActions && (
        <>
          <button
            type="button"
            onTouchStart={(e) => { e.preventDefault(); suppressInlineEditBlur(); suppressNextToolbarHide(); stepCb!(-1); }}
            className="flex-1 h-11 rounded font-mono text-base font-bold bg-muted/70 border border-border/60 text-foreground active:bg-primary/30 active:text-primary select-none transition-colors flex items-center justify-center"
            aria-label="Subtract 1"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onTouchStart={(e) => { e.preventDefault(); suppressInlineEditBlur(); suppressNextToolbarHide(); stepCb!(1); }}
            className="flex-1 h-11 rounded font-mono text-base font-bold bg-muted/70 border border-border/60 text-foreground active:bg-primary/30 active:text-primary select-none transition-colors flex items-center justify-center"
            aria-label="Add 1"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-px h-8 bg-border/50 shrink-0" />
        </>
      )}

      {/* Math operator buttons */}
      {OPERATORS.map(({ label, char }) => (
        <button
          key={char}
          type="button"
          onTouchStart={(e) => { e.preventDefault(); handleInsert(char); }}
          className="flex-1 h-11 rounded font-mono text-base font-semibold bg-muted/70 border border-border/60 text-foreground active:bg-primary/30 active:text-primary select-none transition-colors"
        >
          {label}
        </button>
      ))}

      {/* Backspace */}
      <button
        type="button"
        onTouchStart={(e) => { e.preventDefault(); handleBackspace(); }}
        className="flex-1 h-11 rounded bg-muted/70 border border-border/60 text-muted-foreground active:bg-destructive/20 active:text-destructive select-none flex items-center justify-center text-lg transition-colors"
      >
        ⌫
      </button>

      {/* Save ✓ button — only when an InlineEdit is active */}
      {hasStepActions && (
        <>
          <div className="w-px h-8 bg-border/50 shrink-0" />
          <button
            type="button"
            onTouchStart={(e) => { e.preventDefault(); suppressInlineEditBlur(); saveCb!(); }}
            className="flex-1 h-11 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 active:bg-emerald-500/40 select-none flex items-center justify-center transition-colors"
            aria-label="Save"
          >
            <Check className="w-5 h-5" />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
