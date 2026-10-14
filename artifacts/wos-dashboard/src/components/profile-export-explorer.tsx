import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetProfileExportQueryKey,
  useGetProfileExport,
  useImportProfileExport,
  usePreviewProfileImport,
  useUpdateProfileExportField,
  type ProfileValue,
} from "@workspace/api-client-react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileUp,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 100;
const CHIEF_GEAR_CODES = ["pink-t1-0", "pink-t2-0", "pink-t3-0", "pink-t4-0", "red-t1-0", "red-t2-0", "red-t3-0", "red-t4-0"];
const TIER_VALUES = ["T0", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "FC1", "FC2", "FC3", "FC4", "FC5"];

function prettify(segment: string) {
  return segment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getControlOptions(field: string, value: ProfileValue) {
  if (field.startsWith("profileChiefGear.") && typeof value === "string") return CHIEF_GEAR_CODES;
  if (/(?:tier|rank)$/i.test(field) && typeof value === "string" && TIER_VALUES.includes(value.toUpperCase())) return TIER_VALUES;
  return undefined;
}

function FieldRow({
  field,
  value,
  onSave,
  saving,
}: {
  field: string;
  value: ProfileValue;
  onSave: (value: ProfileValue) => void;
  saving: boolean;
}) {
  const [raw, setRaw] = useState(String(value));
  const options = getControlOptions(field, value);
  const label = prettify(field.split(".").at(-1) ?? field);

  useEffect(() => setRaw(String(value)), [value]);

  const commit = () => {
    let next: ProfileValue = raw;
    if (typeof value === "number") {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        setRaw(String(value));
        return;
      }
      next = parsed;
    }
    if (next !== value) onSave(next);
  };

  return (
    <article className="group grid grid-cols-1 gap-2 border-b border-border/60 px-3 py-3 transition-colors hover:bg-primary/[0.045] md:grid-cols-[minmax(220px,1fr)_minmax(220px,1.7fr)_150px] md:items-center md:gap-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground" title={field}>{label}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground" title={field}>{field}</p>
      </div>
      <div className="min-w-0">
        {typeof value === "boolean" ? (
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded border border-border bg-background px-3 text-sm">
            <input
              aria-label={`Toggle ${field}`}
              className="accent-primary"
              type="checkbox"
              checked={value}
              disabled={saving}
              onChange={event => onSave(event.target.checked)}
            />
            {value ? "Enabled" : "Disabled"}
          </label>
        ) : options ? (
          <select
            aria-label={`Value for ${field}`}
            className="h-9 w-full rounded border border-border bg-background px-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            value={raw}
            disabled={saving}
            onChange={event => {
              setRaw(event.target.value);
              onSave(event.target.value);
            }}
          >
            {options.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <Input
            aria-label={`Value for ${field}`}
            type={typeof value === "number" ? "number" : "text"}
            step={typeof value === "number" ? "any" : undefined}
            className="h-9 font-mono text-xs"
            value={raw}
            disabled={saving}
            onChange={event => setRaw(event.target.value)}
            onBlur={commit}
            onKeyDown={event => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setRaw(String(value));
                event.currentTarget.blur();
              }
            }}
          />
        )}
      </div>
      <span className="hidden justify-self-end text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:block">
        {saving ? "Saving" : typeof value}
      </span>
    </article>
  );
}

export default function ProfileExportExplorer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: profile, isLoading } = useGetProfileExport();
  const previewImport = usePreviewProfileImport();
  const importExport = useImportProfileExport();
  const updateField = useUpdateProfileExportField();
  const [search, setSearch] = useState("");
  const [namespace, setNamespace] = useState("all");
  const [page, setPage] = useState(0);
  const [pendingImport, setPendingImport] = useState<{ csv: string; sourceName: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const values = profile?.values ?? {};
  const namespaces = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(values).forEach(field => {
      const group = field.split(".")[0];
      counts[group] = (counts[group] ?? 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [values]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return Object.entries(values)
      .filter(([field, value]) =>
        (namespace === "all" || field.split(".")[0] === namespace) &&
        (!needle || `${field} ${String(value)}`.toLowerCase().includes(needle)),
      )
      .sort(([a], [b]) => a.localeCompare(b));
  }, [namespace, search, values]);

  const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rowGroups = useMemo(() => {
    const groups = new Map<string, Array<[string, ProfileValue]>>();
    rows.forEach(entry => {
      const group = entry[0].split(".").slice(0, 2).join(".");
      groups.set(group, [...(groups.get(group) ?? []), entry]);
    });
    return [...groups.entries()];
  }, [rows]);

  useEffect(() => setPage(0), [namespace, search]);
  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [maxPage, page]);

  const readFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const csv = await file.text();
      setPendingImport({ csv, sourceName: file.name });
      previewImport.mutate(
        { data: { csv, sourceName: file.name } },
        {
          onSuccess: () => setPreviewOpen(true),
          onError: () => toast({ title: "Could not preview that file", description: "Choose a valid WOS Tools CSV export.", variant: "destructive" }),
        },
      );
    } catch {
      toast({ title: "Could not read that file", variant: "destructive" });
    } finally {
      event.target.value = "";
    }
  };

  const saveImport = () => {
    if (!pendingImport) return;
    importExport.mutate(
      { data: { ...pendingImport, expectedImportedAt: profile?.importedAt ?? "" } },
      {
        onSuccess: data => {
          queryClient.setQueryData(getGetProfileExportQueryKey(), data);
          setPreviewOpen(false);
          setPendingImport(null);
          toast({ title: "Profile export replaced", description: `${Object.keys(data.values).length.toLocaleString()} fields are now available.` });
        },
        onError: () => toast({ title: "Import failed", description: "Your existing profile was not changed.", variant: "destructive" }),
      },
    );
  };

  if (isLoading) {
    return <div className="flex min-h-[420px] items-center justify-center text-muted-foreground"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Loading your profile export</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] animate-in fade-in duration-300">
      <header className="mb-5 border-b border-primary/20 bg-gradient-to-r from-primary/[0.13] via-card to-card px-5 py-5 sm:px-7">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Database className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]">WOS Tools profile data</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {Object.keys(values).length.toLocaleString()} exported fields
              {profile?.sourceName ? ` from ${profile.sourceName}` : " ready to configure"}
              {profile?.importedAt && profile.importedAt !== new Date(0).toISOString() ? ` · Updated ${new Date(profile.importedAt).toLocaleDateString()}` : ""}
            </p>
          </div>
          <div>
            <input ref={inputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={readFile} />
            <Button onClick={() => inputRef.current?.click()} disabled={previewImport.isPending} className="gap-2">
              {previewImport.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Import WOS Tools CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-[600px] border border-border bg-card lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-background/35 lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" />Namespaces</p>
          </div>
          <ScrollArea className="h-[220px] lg:h-[610px]">
            <nav className="p-2">
              <button onClick={() => setNamespace("all")} className={`mb-1 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition ${namespace === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <span>All data</span><span className="font-mono text-xs">{Object.keys(values).length}</span>
              </button>
              {namespaces.map(([name, count]) => (
                <button key={name} onClick={() => setNamespace(name)} className={`mb-1 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition ${namespace === name ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <span className="truncate">{prettify(name)}</span><span className="ml-2 font-mono text-xs opacity-75">{count}</span>
                </button>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-10 pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search any field name or saved value" />
            </label>
            <span className="text-xs text-muted-foreground">{filtered.length.toLocaleString()} matching fields</span>
          </div>
          {rows.length ? (
            <>
              <div className="hidden grid-cols-[minmax(220px,1fr)_minmax(220px,1.7fr)_150px] gap-5 border-b border-border bg-muted/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
                <span>Field</span><span>Saved value</span><span className="text-right">Type</span>
              </div>
              <div>
                {rowGroups.map(([group, groupRows]) => (
                  <details key={group} open className="border-b border-border/70">
                    <summary className="flex cursor-pointer items-center justify-between bg-muted/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:bg-primary/[0.08]">
                      <span>{prettify(group.split(".").at(-1) ?? group)}</span>
                      <span className="font-mono text-[10px]">{groupRows.length} fields</span>
                    </summary>
                    {groupRows.map(([field, value]) => <FieldRow key={field} field={field} value={value} saving={updateField.isPending} onSave={next => updateField.mutate({ data: { field, value: next, expectedImportedAt: profile?.importedAt ?? "" } }, { onSuccess: data => queryClient.setQueryData(getGetProfileExportQueryKey(), data), onError: () => { queryClient.invalidateQueries({ queryKey: getGetProfileExportQueryKey() }); toast({ title: "Field was not saved", description: "The latest profile data was reloaded.", variant: "destructive" }); } })} />)}
                  </details>
                ))}
              </div>
              <footer className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-xs text-muted-foreground">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(current => current - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button>
                  <Button variant="outline" size="sm" disabled={page === maxPage} onClick={() => setPage(current => current + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex min-h-[390px] flex-col items-center justify-center px-6 text-center">
              <Database className="mb-4 h-9 w-9 text-primary/60" />
              <h2 className="font-semibold">{Object.keys(values).length ? "No matching fields" : "No profile export yet"}</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{Object.keys(values).length ? "Try a broader search or select another namespace." : "Import your WOS Tools CSV to bring every profile and calculator setting into one editable place."}</p>
            </div>
          )}
        </section>
      </div>

      <Dialog open={previewOpen} onOpenChange={open => !open && !importExport.isPending && setPreviewOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review profile import</DialogTitle>
            <DialogDescription>Replacing the export updates all saved profile and calculator fields in this dashboard.</DialogDescription>
          </DialogHeader>
          {previewImport.data?.isValid ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded border border-primary/30 bg-primary/10 p-3 text-sm"><CheckCircle2 className="h-5 w-5 text-primary" /><span><strong>{previewImport.data.importedRows.toLocaleString()}</strong> fields are ready to import from {pendingImport?.sourceName}.</span></div>
              <div className="max-h-40 overflow-y-auto rounded border border-border bg-muted/20 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Namespaces found</p><div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">{Object.entries(previewImport.data.groupCounts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => <span key={name} className="flex justify-between gap-2"><span className="truncate">{prettify(name)}</span><span className="font-mono text-muted-foreground">{count}</span></span>)}</div></div>
            </div>
          ) : (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm"><p className="font-medium text-destructive">This CSV needs attention before it can be imported.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{previewImport.data?.errors.slice(0, 8).map(error => <li key={error}>{error}</li>)}</ul></div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={importExport.isPending}>Cancel</Button>
            <Button onClick={saveImport} disabled={!previewImport.data?.isValid || importExport.isPending}>{importExport.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Replace profile export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}