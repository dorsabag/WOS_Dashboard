import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Minus, Plus } from "lucide-react";
import { evalMathExpr } from "@/lib/math-expr";
import { setInlineEditActions } from "@/components/math-keyboard-toolbar";
import type { ItemPreset } from "@/lib/item-presets";

interface InlineEditProps {
  value: string | number;
  onSave: (val: string) => void;
  type?: "text" | "number";
  className?: string;
  presets?: ItemPreset[];
}

// Computed once at module load — safe to use in JSX conditionals (not a hook)
const isTouch =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

export function InlineEdit({ value, onSave, type = "text", className = "", presets = [] }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value.toString());
  // Tracks whether the user has typed (vs only used step buttons).
  // On blur: hasTyped=true → save; hasTyped=false → revert (discard step accumulation).
  const [hasTyped, setHasTyped] = useState(false);
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // These refs always hold the latest handleSave / handleStep / handleCancel so closures
  // passed to setInlineEditActions (registered once per edit session) stay fresh.
  const handleSaveRef = useRef<() => void>(() => {});
  const handleStepRef = useRef<(delta: number) => void>(() => {});
  const handleCancelRef = useRef<() => void>(() => {});

  // Ref wrapping the edit panel container — used by the touch-outside listener.
  const editContainerRef = useRef<HTMLDivElement>(null);

  // Mirror of hasTyped state as a ref so the touch-outside listener (a stable closure)
  // can read the current value without being stale.
  const hasTypedRef = useRef(false);

  // Suppress-blur ref: set to true in a button's onTouchStart (which fires BEFORE blur on iOS
  // Safari). handleBlur checks this and skips cancel/save when a button is being pressed.
  // Only used on desktop; on touch handleBlur is a no-op entirely.
  const suppressBlurRef = useRef(false);
  const suppressBlur = useCallback(() => { suppressBlurRef.current = true; }, []);

  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value.toString());
      setMultipliers({});
    }
  }, [value, isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (currentValue === value.toString()) return;
    if (type === "number") {
      const result = evalMathExpr(currentValue);
      if (result !== null) onSave(String(result));
    } else {
      onSave(currentValue);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentValue(value.toString());
  };

  const handleStep = (delta: number) => {
    // Accumulates — does NOT save and does NOT close edit mode.
    // User must tap ✓ (inline or in toolbar) to commit.
    setCurrentValue((prev) => {
      const base = evalMathExpr(prev) ?? Number(value) ?? 0;
      return String(Math.max(0, base + delta));
    });
  };

  // Keep refs current every render
  handleSaveRef.current = handleSave;
  handleStepRef.current = handleStep;
  handleCancelRef.current = handleCancel;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  // On blur: desktop only — save if typed, else revert.
  // On touch, handleBlur is a no-op; the document touchstart listener below handles
  // save/cancel so that toolbar button taps never trigger an accidental cancel.
  const handleBlur = () => {
    if (isTouch) return;
    if (suppressBlurRef.current) {
      suppressBlurRef.current = false;
      return;
    }
    if (hasTyped) {
      handleSave();
    } else {
      handleCancel();
    }
  };

  // Keep hasTypedRef in sync with hasTyped state so the stable touchstart closure can read it.
  useEffect(() => { hasTypedRef.current = hasTyped; }, [hasTyped]);

  // Focus + select on edit start; reset hasTyped
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setHasTyped(false);
    }
  }, [isEditing]);

  // Touch-only: listen for taps outside the edit panel to save/cancel.
  // This replaces blur-based handling on touch so that toolbar button taps
  // (which cause blur but should NOT close the edit) are excluded explicitly.
  useEffect(() => {
    if (!isEditing || !isTouch) return;
    function onTouchOutside(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (editContainerRef.current?.contains(target)) return;
      if (target.closest?.('[data-math-toolbar="true"]')) return;
      // Tap was outside both the edit panel and the toolbar — save or cancel.
      if (hasTypedRef.current) handleSaveRef.current();
      else handleCancelRef.current();
    }
    document.addEventListener("touchstart", onTouchOutside, { capture: true });
    return () => document.removeEventListener("touchstart", onTouchOutside, { capture: true });
  }, [isEditing]);

  // Register step/save actions with the mobile math toolbar when editing a number
  useEffect(() => {
    if (!isEditing || type !== "number" || !isTouch) return;
    setInlineEditActions(
      (delta) => handleStepRef.current(delta),
      () => handleSaveRef.current(),
      suppressBlur
    );
    return () => setInlineEditActions(null, null);
  }, [isEditing, type, suppressBlur]);

  if (isEditing) {
    // ── Mobile (touch): overlay approach ──────────────────────────────────────
    // Invisible placeholder spans preserve the exact same outer footprint as
    // display mode so the surrounding card layout never reflows. The actual
    // input + controls float absolutely on top of that reserved space.
    if (isTouch) {
      return (
        <div className="relative flex items-center gap-2" ref={editContainerRef}>
          {/* Placeholder — mirrors the display-mode span so outer width/height is unchanged */}
          <span
            className={`font-mono invisible pointer-events-none select-none ${className}`}
            aria-hidden="true"
          >
            {type === "number" ? Number(value).toLocaleString() : value}
          </span>
          {/* Placeholder for the pencil button */}
          <span className="invisible shrink-0 w-[26px] h-[26px]" aria-hidden="true" />

          {/* Actual controls — absolutely positioned, do not affect layout */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20 bg-card/95 backdrop-blur-sm rounded-md pl-1">
            <Input
              ref={inputRef}
              type={type === "number" ? "text" : type}
              inputMode={type === "number" ? "numeric" : undefined}
              data-math={type === "number" ? "true" : undefined}
              value={currentValue}
              onChange={(e) => { setCurrentValue(e.target.value); setHasTyped(true); }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`h-8 w-24 px-2 py-0.5 font-mono bg-background/80 border-primary/70 focus-visible:ring-1 focus-visible:ring-primary text-right ${className}`}
            />
            <button
              onTouchStart={(e) => { suppressBlurRef.current = true; e.preventDefault(); handleSave(); }}
              onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
              className="p-1 rounded text-green-400 hover:bg-green-400/10 transition-colors shrink-0"
              type="button"
              aria-label="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onTouchStart={(e) => { suppressBlurRef.current = true; e.preventDefault(); handleCancel(); }}
              onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
              className="p-1 rounded text-muted-foreground/70 hover:bg-muted/50 transition-colors shrink-0"
              type="button"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Preset buttons — float below the input row */}
          {presets.length > 0 && (
            <div className="absolute right-0 top-full mt-1 flex flex-wrap items-center gap-1.5 z-20">
              <span className="text-[11px] text-muted-foreground shrink-0">Quick:</span>
              {presets.map(p => {
                const key = p.presetName + p.amount;
                const mult = multipliers[key] ?? 1;
                return (
                  <div key={key} className="flex items-center">
                    <button
                      type="button"
                      onTouchStart={e => { suppressBlurRef.current = true; e.preventDefault(); setCurrentValue(String(p.amount * mult)); setHasTyped(true); }}
                      onMouseDown={e => { e.preventDefault(); setCurrentValue(String(p.amount * mult)); setHasTyped(true); }}
                      className="text-xs px-2.5 py-0.5 rounded-l-full bg-muted/60 border border-border/50 border-r-0 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                    >
                      {p.presetName} — {(p.amount * mult).toLocaleString()}
                    </button>
                    <button
                      type="button"
                      onTouchStart={e => { suppressBlurRef.current = true; e.preventDefault(); setMultipliers(prev => ({ ...prev, [key]: Math.max(1, (prev[key] ?? 1) - 1) })); }}
                      onMouseDown={e => { e.preventDefault(); setMultipliers(prev => ({ ...prev, [key]: Math.max(1, (prev[key] ?? 1) - 1) })); }}
                      disabled={mult <= 1}
                      className="text-[10px] w-5 py-0.5 bg-muted/40 border-y border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 text-center leading-none"
                      aria-label="Decrease multiplier"
                    >−</button>
                    <span className="text-[10px] px-1 py-0.5 bg-muted/30 border-y border-border/50 text-muted-foreground font-mono select-none leading-none flex items-center">×{mult}</span>
                    <button
                      type="button"
                      onTouchStart={e => { suppressBlurRef.current = true; e.preventDefault(); setMultipliers(prev => ({ ...prev, [key]: (prev[key] ?? 1) + 1 })); }}
                      onMouseDown={e => { e.preventDefault(); setMultipliers(prev => ({ ...prev, [key]: (prev[key] ?? 1) + 1 })); }}
                      className="text-[10px] w-5 py-0.5 rounded-r-full bg-muted/40 border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors text-center leading-none"
                      aria-label="Increase multiplier"
                    >+</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // ── Desktop: standard expanding layout ───────────────────────────────────
    return (
      <div className="flex flex-col gap-1.5" ref={editContainerRef}>
        <div className="flex items-center gap-1">
          {type === "number" && (
            <button
              onTouchStart={(e) => { suppressBlurRef.current = true; e.preventDefault(); handleStep(-1); }}
              onMouseDown={(e) => { e.preventDefault(); handleStep(-1); }}
              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border/50 hover:border-primary/40"
              type="button"
              aria-label="Subtract 1"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          )}
          <Input
            ref={inputRef}
            type={type === "number" ? "text" : type}
            inputMode={type === "number" ? "numeric" : undefined}
            data-math={type === "number" ? "true" : undefined}
            value={currentValue}
            onChange={(e) => { setCurrentValue(e.target.value); setHasTyped(true); }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`h-9 w-40 px-2 py-1 font-mono bg-background/80 border-primary/70 focus-visible:ring-1 focus-visible:ring-primary text-right ${className}`}
          />
          {type === "number" && (
            <button
              onTouchStart={(e) => { suppressBlurRef.current = true; e.preventDefault(); handleStep(1); }}
              onMouseDown={(e) => { e.preventDefault(); handleStep(1); }}
              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border/50 hover:border-primary/40"
              type="button"
              aria-label="Add 1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onTouchStart={(e) => { suppressBlurRef.current = true; e.preventDefault(); handleSave(); }}
            onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
            className="p-1 rounded text-green-400 hover:bg-green-400/10 transition-colors"
            type="button"
            aria-label="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onTouchStart={(e) => { suppressBlurRef.current = true; e.preventDefault(); handleCancel(); }}
            onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
            className="p-1 rounded text-muted-foreground hover:bg-muted/50 transition-colors"
            type="button"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {presets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground shrink-0">Quick:</span>
            {presets.map(p => {
              const key = p.presetName + p.amount;
              const mult = multipliers[key] ?? 1;
              return (
                <div key={key} className="flex items-center">
                  <button
                    type="button"
                    onTouchStart={e => { suppressBlurRef.current = true; e.preventDefault(); setCurrentValue(String(p.amount * mult)); setHasTyped(true); }}
                    onMouseDown={e => { e.preventDefault(); setCurrentValue(String(p.amount * mult)); setHasTyped(true); }}
                    className="text-xs px-2.5 py-0.5 rounded-l-full bg-muted/60 border border-border/50 border-r-0 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    {p.presetName} — {(p.amount * mult).toLocaleString()}
                  </button>
                  <button
                    type="button"
                    onTouchStart={e => { suppressBlurRef.current = true; e.preventDefault(); setMultipliers(prev => ({ ...prev, [key]: Math.max(1, (prev[key] ?? 1) - 1) })); }}
                    onMouseDown={e => { e.preventDefault(); setMultipliers(prev => ({ ...prev, [key]: Math.max(1, (prev[key] ?? 1) - 1) })); }}
                    disabled={mult <= 1}
                    className="text-[10px] w-5 py-0.5 bg-muted/40 border-y border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 text-center leading-none"
                    aria-label="Decrease multiplier"
                  >−</button>
                  <span className="text-[10px] px-1 py-0.5 bg-muted/30 border-y border-border/50 text-muted-foreground font-mono select-none leading-none flex items-center">×{mult}</span>
                  <button
                    type="button"
                    onTouchStart={e => { suppressBlurRef.current = true; e.preventDefault(); setMultipliers(prev => ({ ...prev, [key]: (prev[key] ?? 1) + 1 })); }}
                    onMouseDown={e => { e.preventDefault(); setMultipliers(prev => ({ ...prev, [key]: (prev[key] ?? 1) + 1 })); }}
                    className="text-[10px] w-5 py-0.5 rounded-r-full bg-muted/40 border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors text-center leading-none"
                    aria-label="Increase multiplier"
                  >+</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono ${className}`}>
        {type === "number" ? Number(value).toLocaleString() : value}
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="p-1 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
        type="button"
        aria-label="Edit"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
