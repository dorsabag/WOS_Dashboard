import { ImageIcon, X, Loader2 } from "lucide-react";

const HERO_LABELS = [
  { value: "", display: "—" },
  { value: "Infantry 🛡️", display: "Infantry 🛡️" },
  { value: "Lancer 🗡️", display: "Lancer 🗡️" },
  { value: "MM 🏹", display: "MM 🏹" },
];

export function resolveIconUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/priv/") || value.startsWith("/pub/")) {
    return `/api/storage${value}`;
  }
  return value;
}

interface MarchIconSlotProps {
  iconValue: string | null | undefined;
  onOpenPicker: () => void;
  onRemove: () => void;
  label?: string;
  onLabelChange?: (label: string) => void;
  isPending?: boolean;
}

export function MarchIconSlot({
  iconValue,
  onOpenPicker,
  onRemove,
  label = "",
  onLabelChange,
  isPending = false,
}: MarchIconSlotProps) {
  const imageUrl = resolveIconUrl(iconValue);

  const handleClear = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove();
  };

  return (
    <div className="flex flex-col items-center gap-1" style={{ flexShrink: 0 }}>
      <div
        className="relative flex items-center justify-center w-16 h-16 rounded border border-dashed border-border/60 bg-muted/20 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all group"
        onClick={() => { if (!isPending) onOpenPicker(); }}
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="march icon"
              className="w-full h-full object-cover rounded"
              draggable={false}
            />
            <div className="absolute inset-0 rounded hidden group-hover:flex items-center justify-center bg-black/30 pointer-events-none">
              <ImageIcon className="w-4 h-4 text-white/70" />
            </div>
            <button
              type="button"
              onClick={handleClear}
              onTouchEnd={handleClear}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 flex items-center justify-center text-white shadow hover:bg-destructive/80 transition-all"
              aria-label="Remove icon"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <ImageIcon className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
        )}
      </div>

      <select
        value={label}
        onChange={(e) => onLabelChange?.(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="w-16 text-[9px] bg-muted/30 border border-border/40 rounded text-muted-foreground text-center leading-tight py-0.5 cursor-pointer hover:border-border/70 focus:outline-none focus:border-primary/50 transition-colors appearance-none"
        style={{ paddingLeft: 2, paddingRight: 2 }}
      >
        {HERO_LABELS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.display}
          </option>
        ))}
      </select>
    </div>
  );
}
