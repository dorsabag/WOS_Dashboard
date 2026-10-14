import React, { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LightboxImage {
  src: string;
  alt: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  /** Index of the currently shown image, or null when closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

export function ImageLightbox({ images, index, onClose, onNavigate }: ImageLightboxProps) {
  const isOpen = index !== null;
  const image = isOpen ? images[index] : null;
  const hasPrev = isOpen && index > 0;
  const hasNext = isOpen && index < images.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
    },
    [isOpen, index, hasPrev, hasNext, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Full-size view: ${image.alt}`}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Close button */}
      <button
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev arrow */}
      {hasPrev && (
        <button
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative z-10 flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <LightboxImg src={image.src} alt={image.alt} />

        {/* Caption + counter */}
        <div className="flex items-center gap-3 text-white/80 text-sm">
          <span className="truncate max-w-[60vw]">{image.alt}</span>
          {images.length > 1 && (
            <span className="shrink-0 text-white/50 text-xs tabular-nums">
              {index + 1} / {images.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LightboxImg({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = React.useState(false);

  // Reset broken state when src changes
  React.useEffect(() => {
    setBroken(false);
  }, [src]);

  if (broken) {
    return (
      <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-muted-foreground">
        <ImageOff className="h-10 w-10 opacity-50" />
        <span className="text-xs opacity-70">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "max-h-[80vh] max-w-[85vw] rounded-lg object-contain shadow-2xl",
        "ring-1 ring-white/10"
      )}
      onError={() => setBroken(true)}
    />
  );
}
