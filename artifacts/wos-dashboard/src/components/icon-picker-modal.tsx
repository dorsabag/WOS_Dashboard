import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ImagePlus, X } from "lucide-react";

interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  currentImageUrl?: string | null;
  onSelectUrl: (url: string) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function IconPickerModal({
  open,
  onClose,
  isPending,
  currentImageUrl,
  onSelectUrl,
  onUpload,
  onRemove,
}: IconPickerModalProps) {
  const baseUrl = import.meta.env.BASE_URL as string;
  const apiBase = baseUrl?.replace(/\/$/, "") ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: iconFiles = [], isLoading: iconsLoading } = useQuery<string[]>({
    queryKey: ["icons", "library"],
    queryFn: () =>
      fetch(`${apiBase}/api/icons`).then(r => {
        if (!r.ok) throw new Error(`Failed to load icons: ${r.status}`);
        return r.json();
      }),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
        </DialogHeader>
        {currentImageUrl && (
          <div className="flex items-center justify-between gap-3 px-1 pb-2 border-b border-border/40 mb-1">
            <div className="flex items-center gap-2">
              <img src={currentImageUrl} alt="Current icon" className="w-8 h-8 rounded object-cover border border-border/40" />
              <span className="text-sm text-muted-foreground">Current icon</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-3"
              onClick={onRemove}
            >
              <X className="w-3.5 h-3.5" />
              Remove icon
            </Button>
          </div>
        )}
        <Tabs defaultValue="library">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">Library</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            {iconsLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : iconFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No icons found.</p>
            ) : (
              <div className="grid grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1 mt-2">
                {iconFiles.map(file => {
                  const url = `${baseUrl}icons/${file}`;
                  const label = file.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
                  return (
                    <button
                      key={file}
                      type="button"
                      title={label}
                      disabled={isPending}
                      className="w-full aspect-square rounded border border-border/40 bg-muted/20 hover:border-primary/60 hover:bg-muted/50 transition-colors p-1 flex items-center justify-center overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => onSelectUrl(url)}
                    >
                      <img src={url} alt={label} className="w-full h-full object-contain" />
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <p className="text-sm text-muted-foreground text-center">
                Upload a custom image from your device
              </p>
              <Button
                variant="outline"
                className="gap-2"
                disabled={isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {isPending ? "Saving…" : "Choose file"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
