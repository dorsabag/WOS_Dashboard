import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImageCardProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Renders a gallery image with a graceful broken-image fallback.
 * When the browser cannot load the image (e.g. the stored object is missing)
 * an error state is shown instead of a broken <img> icon or JS error.
 */
export function GalleryImageCard({ src, alt, className }: GalleryImageCardProps) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        role="img"
        aria-label={`${alt} (image unavailable)`}
        data-testid="broken-image-fallback"
        className={cn(
          "aspect-square w-full flex flex-col items-center justify-center gap-1 p-1.5",
          "text-muted-foreground bg-muted/30"
        )}
      >
        <ImageOff className="h-6 w-6 opacity-50" />
        <span className="text-[10px] text-center leading-tight opacity-70">Unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
