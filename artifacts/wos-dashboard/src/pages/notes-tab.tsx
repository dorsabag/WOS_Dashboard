import React, { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetNoteImagesQueryKey,
  getGetNotesQueryKey,
  useDeleteNoteImage,
  useGetNoteImages,
  useGetNotes,
  useRegisterNoteImage,
  useUpdateNotes,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Strikethrough,
  Undo,
  Redo,
  Minus,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUpload } from "@/hooks/use-upload";
import { GalleryImageCard } from "@/components/gallery-image-card";
import { ImageLightbox } from "@/components/image-lightbox";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={active}
            onPressedChange={onClick}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0 data-[state=on]:bg-primary/15 data-[state=on]:text-primary",
              "hover:bg-muted/60 transition-colors"
            )}
          >
            {children}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ToolbarActionButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className="h-8 w-8 p-0 hover:bg-muted/60"
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function NotesTab() {
  const queryClient = useQueryClient();
  const { data: note, isLoading } = useGetNotes();
  const gallery = useGetNoteImages();
  const updateNotes = useUpdateNotes();
  const registerImage = useRegisterNoteImage();
  const deleteImage = useDeleteNoteImage();
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [galleryError, setGalleryError] = React.useState<string | null>(null);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  const handleDeleteImage = async (id: number) => {
    setConfirmDeleteId(null);
    try {
      await deleteImage.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getGetNoteImagesQueryKey() });
    } catch {
      setGalleryError("Could not delete the image. Please try again.");
    }
  };

  const saveContent = useCallback((html: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateNotes.mutate({ data: { content: html } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNotesQueryKey() });
        },
      });
    }, 800);
  }, [updateNotes, queryClient]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Underline is added separately below; disable StarterKit's copy to avoid duplicates
        strike: {},
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Write your notes here... Select text to format it, or use the toolbar above.",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-220px)] px-6 py-5 text-base leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      saveContent(editor.getHTML());
    },
  });

  // Load initial content once data arrives
  useEffect(() => {
    if (editor && note && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      // Only set if there's actual content (avoid overwriting empty with empty)
      if (note.content && note.content !== "<p></p>") {
        editor.commands.setContent(note.content, { emitUpdate: false });
      }
    }
  }, [editor, note]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleImageFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setGalleryError(null);
    setIsRegistering(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image file.`);
        }

        const upload = await uploadFile(file);
        if (!upload) {
          throw new Error(`Could not upload ${file.name}.`);
        }

        await registerImage.mutateAsync({
          data: {
            objectPath: upload.objectPath,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
          },
        });
      }
      await queryClient.invalidateQueries({ queryKey: getGetNoteImagesQueryKey() });
    } catch (error) {
      setGalleryError(error instanceof Error ? error.message : "Could not save the image.");
      await queryClient.invalidateQueries({ queryKey: getGetNoteImagesQueryKey() });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-[60vh] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col h-[calc(100vh-280px)] min-h-[320px] border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border/50 bg-muted/30">
        {/* Headings */}
        <ToolbarButton
          title="Heading 1"
          active={editor?.isActive("heading", { level: 1 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor?.isActive("heading", { level: 2 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor?.isActive("heading", { level: 3 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Inline formatting */}
        <ToolbarButton
          title="Bold (Ctrl+B)"
          active={editor?.isActive("bold") ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic (Ctrl+I)"
          active={editor?.isActive("italic") ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline (Ctrl+U)"
          active={editor?.isActive("underline") ?? false}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor?.isActive("strike") ?? false}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <ToolbarButton
          title="Bullet list"
          active={editor?.isActive("bulletList") ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor?.isActive("orderedList") ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <ToolbarButton
          title="Align left"
          active={editor?.isActive({ textAlign: "left" }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor?.isActive({ textAlign: "center" }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor?.isActive({ textAlign: "right" }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Block quote / rule */}
        <ToolbarButton
          title="Block quote"
          active={editor?.isActive("blockquote") ?? false}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <span className="text-xs font-bold leading-none">&ldquo;</span>
        </ToolbarButton>
        <ToolbarActionButton
          title="Horizontal rule"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarActionButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo / Redo */}
        <ToolbarActionButton
          title="Undo (Ctrl+Z)"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolbarActionButton>
        <ToolbarActionButton
          title="Redo (Ctrl+Shift+Z)"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolbarActionButton>

        {/* Auto-save indicator */}
        <div className="ml-auto flex items-center gap-1.5 pr-1">
          {updateNotes.isPending ? (
            <span className="text-[11px] text-muted-foreground animate-pulse">Saving…</span>
          ) : (
            <span className="text-[11px] text-muted-foreground/50">Auto-saved</span>
          )}
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
      </div>

      <section className="rounded-xl border border-border/50 bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              <ImageIcon className="h-4 w-4 text-primary" />
              WOS Images
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Keep a small collection of Whiteout Survival references here.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageFiles}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading || isRegistering}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading || isRegistering ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {isUploading || isRegistering ? "Uploading…" : "Add images"}
            </Button>
          </div>
        </div>

        {galleryError && (
          <Alert variant="destructive" className="mt-3 py-2">
            <AlertDescription className="text-xs">{galleryError}</AlertDescription>
          </Alert>
        )}

        {gallery.isLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {[0, 1, 2].map(index => (
              <Skeleton key={index} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : gallery.isError ? (
          <p className="mt-3 text-xs text-destructive">
            Could not load your saved images. Refresh the tab to try again.
          </p>
        ) : gallery.data && gallery.data.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {gallery.data.map((image, idx) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-lg border border-border/50 bg-background/60"
                title={image.fileName}
              >
                <button
                  className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`View full size: ${image.fileName}`}
                  onClick={() => setLightboxIndex(idx)}
                >
                  <GalleryImageCard
                    src={`${BASE}/api/storage${image.objectPath}`}
                    alt={image.fileName}
                    className="aspect-square w-full object-contain p-1.5"
                  />
                </button>
                {/* Delete controls — shown on hover */}
                {confirmDeleteId === image.id ? (
                  <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-1 bg-background/90 p-1.5">
                    <span className="flex-1 truncate text-[10px] text-muted-foreground">Delete?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 w-6 p-0 shrink-0"
                      disabled={deleteImage.isPending}
                      onClick={() => handleDeleteImage(image.id)}
                    >
                      {deleteImage.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 transition-opacity group-hover:flex group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    title="Delete image"
                    onClick={() => setConfirmDeleteId(image.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <div className="truncate border-t border-border/40 px-2 py-1 text-[10px] text-muted-foreground">
                  {image.fileName}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
            No images yet. Add a few WOS references to build your gallery.
          </p>
        )}
      </section>

      {/* Lightbox — full-size image overlay */}
      {gallery.data && gallery.data.length > 0 && (
        <ImageLightbox
          images={gallery.data.map(img => ({
            src: `${BASE}/api/storage${img.objectPath}`,
            alt: img.fileName,
          }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
