import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { 
  useGetItems,
  useGetItemCategories,
  useGetGoals,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  getGetItemsQueryKey,
  getGetItemCategoriesQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEdit } from "@/components/inline-edit";
import { getPresetsForItem } from "@/lib/item-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Package, Search, ChevronLeft, PenLine, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ITEM_CATALOG, CATALOG_CATEGORIES, type CatalogItem } from "@/data/item-catalog";
import { evalMathExpr } from "@/lib/math-expr";
import { getCategoryColor } from "@/lib/category-colors";

// ── Calendar event types (shared with goals-tab / calendar-tab) ─────────────

interface TodoistDue {
  date: string;
  datetime: string | null;
  string: string;
  is_recurring: boolean;
}

interface CalendarEvent {
  id: string;
  content: string;
  description: string | null;
  due: TodoistDue | null;
  priority: number;
}

async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const res = await fetch(`${base}/api/todoist/events`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function formatShortDate(dateStr: string): string {
  const d = parseISO(dateStr);
  return format(d, "dd.MM");
}

function formatDaysLeftLabel(dateStr: string): string | null {
  const d = parseISO(dateStr);
  const days = differenceInCalendarDays(d, new Date());
  if (days <= 0) return null;
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

function subcatToId(label: string): string {
  return "subcat-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

// ────────────────────────────────────────────────────────────────────────────

type DialogStep = "catalog" | "quantity" | "update" | "custom";

function ItemIcon({ imageUrl, size = "md" }: { imageUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "text-2xl" : size === "lg" ? "text-5xl" : "text-3xl";
  if (imageUrl && imageUrl.length <= 4) {
    return <span className={sizeClass}>{imageUrl}</span>;
  }
  if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("/") || imageUrl.startsWith("./") || imageUrl.startsWith("data:"))) {
    const dim = size === "sm" ? 32 : size === "lg" ? 56 : 40;
    return (
      <img
        src={imageUrl}
        alt=""
        width={dim}
        height={dim}
        className="object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const fallback = target.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "inline-flex";
        }}
      />
    );
  }
  return <Package className={size === "sm" ? "w-6 h-6" : size === "lg" ? "w-12 h-12" : "w-9 h-9"} />;
}

// ── Bulk import helpers ────────────────────────────────────────────────────

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[()[\]]/g, " ").split(/\s+/).filter(Boolean);
}

function fuzzyScore(input: string, catalog: string): number {
  const inputTokens = tokenize(input);
  const catalogTokens = tokenize(catalog);
  let matches = 0;
  for (const t of inputTokens) {
    if (catalogTokens.some(ct => {
      if (ct === t) return true;
      if (ct.length < 3 || t.length < 3) return false;
      return ct.includes(t) || t.includes(ct);
    })) matches++;
  }
  return matches / Math.max(inputTokens.length, catalogTokens.length, 1);
}

function findBestCatalogMatch(name: string): CatalogItem | null {
  const lower = name.toLowerCase().trim();
  const exact = ITEM_CATALOG.find(c => c.name.toLowerCase() === lower);
  if (exact) return exact;

  let best: CatalogItem | null = null;
  let bestScore = 0;
  for (const c of ITEM_CATALOG) {
    const score = fuzzyScore(lower, c.name);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 0.4 ? best : null;
}

interface ParsedRow {
  raw: string;
  inputName: string;
  amount: number | null;
  amountError: string | null;
  catalogMatch: CatalogItem | null;
  isCustom: boolean;
}

function parseBulkText(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith("#"))
    .map(line => {
      const delimMatch = line.match(/^(.+?)[\t,;]\s*(.*)$/);
      let inputName: string;
      let rawAmount: string;

      if (delimMatch) {
        inputName = delimMatch[1].trim();
        rawAmount = delimMatch[2].trim();
      } else {
        inputName = line.trim();
        rawAmount = "";
      }

      let amount: number | null = null;
      let amountError: string | null = null;

      if (rawAmount === "" || rawAmount === "0") {
        amount = 0;
      } else {
        const parsed = parseInt(rawAmount.replace(/[,_\s]/g, ""), 10);
        if (isNaN(parsed)) {
          amountError = `"${rawAmount}" is not a valid number`;
          amount = null;
        } else if (parsed < 0) {
          amountError = "Amount must be ≥ 0";
          amount = null;
        } else {
          amount = parsed;
        }
      }

      const catalogMatch = findBestCatalogMatch(inputName);

      return {
        raw: line,
        inputName,
        amount,
        amountError,
        catalogMatch,
        isCustom: catalogMatch === null,
      };
    });
}

interface BulkImportDialogProps {
  activeCategory: string;
  onSuccess: () => void;
}

function BulkImportDialog({ activeCategory, onSuccess }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ ok: number; failed: number } | null>(null);
  const { toast } = useToast();
  const createItem = useCreateItem();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parsed = useMemo(() => rows, [rows]);
  const validRows = useMemo(() => parsed?.filter(r => r.amountError === null) ?? [], [parsed]);
  const errorRows = useMemo(() => parsed?.filter(r => r.amountError !== null) ?? [], [parsed]);

  const handleParse = () => {
    const result = parseBulkText(rawText);
    setRows(result);
    setImportResults(null);
  };

  const handleConfirm = async () => {
    if (!validRows.length) return;
    setImporting(true);
    let ok = 0;
    let failed = 0;

    for (const row of validRows) {
      const matched = row.catalogMatch;
      await new Promise<void>(resolve => {
        createItem.mutate({
          data: {
            name: matched ? matched.name : row.inputName,
            category: matched ? matched.category : activeCategory,
            subcategory: matched?.subcategory,
            currentAmount: row.amount ?? 0,
            imageUrl: matched?.imageUrl,
          }
        }, {
          onSuccess: () => { ok++; resolve(); },
          onError: () => { failed++; resolve(); },
        });
      });
    }

    queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({ category: activeCategory }) });
    queryClient.invalidateQueries({ queryKey: getGetItemCategoriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });

    setImporting(false);
    setImportResults({ ok, failed });

    if (failed === 0) {
      toast({ title: `${ok} item${ok !== 1 ? "s" : ""} imported successfully` });
      setOpen(false);
      onSuccess();
    } else {
      toast({
        title: `${ok} imported, ${failed} failed`,
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setRawText("");
      setRows(null);
      setImportResults(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 h-8">
          <Upload className="w-4 h-4" /> Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Bulk Import Items
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Paste one item per line in <code className="bg-muted px-1 rounded text-xs">Name, Amount</code> format.
            Item names are matched to the catalog automatically.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-4 overflow-y-auto flex-1">
          {!parsed ? (
            <>
              <Textarea
                ref={textareaRef}
                className="font-mono text-sm min-h-[200px] resize-y"
                placeholder={`General Speedup 1h, 50\nHero Shard, 120\nDiamonds, 5000\nFood (1M), 30`}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Supports CSV, tab-separated, or comma-separated. Lines starting with # are ignored.
                Amounts can include commas (e.g. 1,000).
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {validRows.length} ready
                  </span>
                  {errorRows.length > 0 && (
                    <span className="flex items-center gap-1.5 text-destructive font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {errorRows.length} with errors
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => { setRows(null); setImportResults(null); }}
                >
                  Edit
                </Button>
              </div>

              <div className="rounded-sm border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">You typed</th>
                      <th className="px-3 py-2 text-left font-medium">Will be saved as</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-center font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {parsed.map((row, i) => (
                      <tr
                        key={i}
                        className={row.amountError ? "bg-destructive/5" : "bg-card/60"}
                      >
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-[160px] truncate">
                          {row.inputName}
                        </td>
                        <td className="px-3 py-2">
                          {row.catalogMatch ? (
                            <div className="flex items-center gap-2">
                              <ItemIcon imageUrl={row.catalogMatch.imageUrl} size="sm" />
                              <div>
                                <div className="font-medium text-xs leading-tight">{row.catalogMatch.name}</div>
                                <div className="text-[10px] text-muted-foreground">{row.catalogMatch.category}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <span className="font-medium">{row.inputName}</span>
                              <span className="text-muted-foreground ml-1.5 text-[10px]">custom → {activeCategory}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {row.amountError ? (
                            <span className="text-destructive text-xs font-normal">{row.amountError}</span>
                          ) : (
                            <span className="text-primary">{(row.amount ?? 0).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.amountError ? (
                            <AlertCircle className="w-4 h-4 text-destructive inline-block" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {errorRows.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Rows with errors will be skipped. Fix them by editing the text above.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50">
          {!parsed ? (
            <Button
              onClick={handleParse}
              disabled={!rawText.trim()}
            >
              Preview Import
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={importing || validRows.length === 0}
              className="gap-2"
            >
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              {importing
                ? "Importing…"
                : `Import ${validRows.length} Item${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ResourcesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const scrolled = useScrolled();

  const [step, setStep] = useState<DialogStep>("catalog");
  const [catalogCategory, setCatalogCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [existingItemId, setExistingItemId] = useState<number | null>(null);
  const [existingItemAmount, setExistingItemAmount] = useState<number>(0);
  const [updateQuantity, setUpdateQuantity] = useState("");
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [customImageInputMode, setCustomImageInputMode] = useState<"upload" | "url">("upload");

  const [editImageItemId, setEditImageItemId] = useState<number | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageMode, setEditImageMode] = useState<"upload" | "url">("upload");

  const { data: categories, isLoading: loadingCats } = useGetItemCategories();
  const itemQueryParams = activeCategory ? { category: activeCategory } : {};
  const { data: items, isLoading: loadingItems } = useGetItems(
    itemQueryParams,
    { query: { queryKey: getGetItemsQueryKey(itemQueryParams) } }
  );
  const { data: goals } = useGetGoals();

  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const createItem = useCreateItem();

  type GoalMatch = {
    goalId: number;
    goalName: string;
    multiplier: number;
    requiredAmount: number;
    effectiveRequired: number;
    deadlineEventId: string | null;
    isCompleted: boolean;
  };

  const goalLinkMap = useMemo(() => {
    const map = new Map<string, GoalMatch[]>();
    if (!goals) return map;
    for (const goal of goals) {
      const multiplier = goal.multiplier ?? 1;
      for (const gi of goal.goalItems) {
        const key = gi.itemName.toLowerCase().trim();
        const effectiveRequired = gi.requiredAmount * multiplier;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({
          goalId: goal.id,
          goalName: goal.name,
          multiplier,
          requiredAmount: gi.requiredAmount,
          effectiveRequired,
          deadlineEventId: goal.deadlineEventId ?? null,
          isCompleted: goal.isCompleted,
        });
      }
    }
    return map;
  }, [goals]);

  const { data: calendarEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["todoist-events"],
    queryFn: fetchCalendarEvents,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const eventById = useMemo(() => {
    const m = new Map<string, CalendarEvent>();
    for (const e of calendarEvents) m.set(e.id, e);
    return m;
  }, [calendarEvents]);

  const existingItemMap = useMemo(
    () => new Map(items?.map(i => [i.name.toLowerCase(), { id: i.id, currentAmount: i.currentAmount }]) ?? []),
    [items]
  );

  const subcategoryGroups = useMemo(() => {
    if (!items) return [];
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.subcategory ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [items]);

  const filteredCatalog = useMemo(() => {
    return ITEM_CATALOG.filter(item => {
      const matchesCat = catalogCategory === "All" || item.category === catalogCategory;
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [catalogCategory, search]);

  const resetDialog = () => {
    setStep("catalog");
    setCatalogCategory("All");
    setSearch("");
    setSelectedCatalogItem(null);
    setQuantity("");
    setExistingItemId(null);
    setExistingItemAmount(0);
    setUpdateQuantity("");
    setCustomName("");
    setCustomAmount("");
    setCustomCategory(activeCategory);
    setCustomImageUrl("");
    setCustomImageInputMode("upload");
  };

  const handleOpenChange = (open: boolean) => {
    setIsAddOpen(open);
    if (!open) resetDialog();
  };

  const handleSelectCatalogItem = (item: CatalogItem) => {
    setSelectedCatalogItem(item);
    const existing = existingItemMap.get(item.name.toLowerCase());
    if (existing) {
      setExistingItemId(existing.id);
      setExistingItemAmount(existing.currentAmount);
      setUpdateQuantity(String(existing.currentAmount));
      setStep("update");
    } else {
      setQuantity("0");
      setStep("quantity");
    }
  };

  const handleConfirmUpdate = () => {
    if (!selectedCatalogItem || existingItemId === null) return;
    const amount = evalMathExpr(updateQuantity) ?? existingItemAmount;
    updateItem.mutate({
      id: existingItemId,
      data: { currentAmount: amount },
    }, {
      onSuccess: () => {
        handleOpenChange(false);
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({ category: activeCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: `${selectedCatalogItem.name} updated` });
      }
    });
  };

  const handleAddAnywayFromUpdate = () => {
    setQuantity("0");
    setStep("quantity");
  };

  const handleConfirmCatalogItem = () => {
    if (!selectedCatalogItem) return;
    const amount = evalMathExpr(quantity) ?? 0;
    createItem.mutate({
      data: {
        name: selectedCatalogItem.name,
        category: selectedCatalogItem.category,
        subcategory: selectedCatalogItem.subcategory,
        currentAmount: amount,
        imageUrl: selectedCatalogItem.imageUrl,
      }
    }, {
      onSuccess: () => {
        handleOpenChange(false);
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({ category: activeCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetItemCategoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: `${selectedCatalogItem.name} added` });
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomImageUrl(ev.target?.result as string ?? "");
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditImageUrl(ev.target?.result as string ?? "");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItemImage = () => {
    if (editImageItemId === null) return;
    updateItem.mutate({
      id: editImageItemId,
      data: { imageUrl: editImageUrl || undefined },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({ category: activeCategory }) });
        setEditImageItemId(null);
        setEditImageUrl("");
        setEditImageMode("upload");
        toast({ title: "Image updated" });
      }
    });
  };

  const handleConfirmCustom = () => {
    if (!customName.trim()) return;
    const amount = evalMathExpr(customAmount) ?? 0;
    createItem.mutate({
      data: {
        name: customName.trim(),
        category: customCategory || activeCategory || categories?.[0]?.name || "Misc",
        currentAmount: amount,
        imageUrl: customImageUrl || undefined,
      }
    }, {
      onSuccess: () => {
        handleOpenChange(false);
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({ category: activeCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetItemCategoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Item added" });
      }
    });
  };

  const handleUpdateAmount = (id: number, value: string) => {
    const amount = evalMathExpr(value.replace(/,/g, ""));
    if (amount === null) return;
    updateItem.mutate({
      id,
      data: { currentAmount: amount }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({ category: activeCategory }) });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Remove this item?")) return;
    deleteItem.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({ category: activeCategory }) });
        queryClient.invalidateQueries({ queryKey: getGetItemCategoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey({ category: activeCategory }) });
    queryClient.invalidateQueries({ queryKey: getGetItemCategoriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  if (loadingCats) {
    return <Skeleton className="h-96 w-full bg-card/50" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveCategory("")}
          className={`px-4 py-2 rounded-sm text-sm font-semibold whitespace-nowrap transition-colors ${
            activeCategory === ""
              ? 'bg-primary text-primary-foreground'
              : 'bg-card/50 hover:bg-muted text-muted-foreground'
          }`}
        >
          All
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            className={`px-4 py-2 rounded-sm text-sm font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat.name 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card/50 hover:bg-muted text-muted-foreground'
            }`}
          >
            {cat.name} <span className="opacity-60 ml-1 text-xs">({cat.count})</span>
          </button>
        ))}
      </div>

      <Card className="bg-card/40 backdrop-blur border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {activeCategory || "All"} Inventory
          </CardTitle>
          <div className="flex items-center gap-2">
            <BulkImportDialog activeCategory={activeCategory} onSuccess={invalidateAll} />
            <Dialog open={isAddOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 h-8">
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-2">
                    {(step === "quantity" || step === "update" || step === "custom") && (
                      <button
                        onClick={() => setStep("catalog")}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    <DialogTitle>
                      {step === "catalog" && "Add Item"}
                      {step === "quantity" && selectedCatalogItem?.name}
                      {step === "update" && selectedCatalogItem?.name}
                      {step === "custom" && "Custom Item"}
                    </DialogTitle>
                  </div>
                </DialogHeader>

                {step === "catalog" && (
                  <div className="flex flex-col gap-4 px-6 pb-6 overflow-hidden">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search items..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {["All", ...CATALOG_CATEGORIES].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setCatalogCategory(cat)}
                          className={`px-3 py-1 rounded-sm text-xs font-semibold transition-colors ${
                            catalogCategory === cat
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
                      {filteredCatalog.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                          No items match your search
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {filteredCatalog.map(item => {
                            const alreadyOwned = existingItemMap.has(item.name.toLowerCase());
                            return (
                              <button
                                key={`${item.category}-${item.name}`}
                                onClick={() => handleSelectCatalogItem(item)}
                                className={`relative flex flex-col items-center gap-2 p-3 rounded-sm border text-center transition-all hover:scale-105 active:scale-95 ${
                                  alreadyOwned
                                    ? "border-primary/40 bg-primary/10"
                                    : "border-border/40 bg-card/60 hover:border-primary/60 hover:bg-muted/30"
                                }`}
                              >
                                {alreadyOwned && (
                                  <span className="absolute top-1 right-1 text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">✓</span>
                                )}
                                <ItemIcon imageUrl={item.imageUrl} size="lg" />
                                <span className="text-xs font-medium leading-tight">{item.name}</span>
                                {item.subcategory && (
                                  <span className="text-[10px] text-muted-foreground">{item.subcategory}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/50 pt-3 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {filteredCatalog.length} item{filteredCatalog.length !== 1 ? "s" : ""} shown
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setStep("custom")}
                      >
                        <PenLine className="w-4 h-4" />
                        Custom item
                      </Button>
                    </div>
                  </div>
                )}

                {step === "quantity" && selectedCatalogItem && (
                  <div className="flex flex-col gap-6 px-6 pb-6">
                    <div className="flex flex-col items-center gap-3 py-4">
                      <ItemIcon imageUrl={selectedCatalogItem.imageUrl} size="lg" />
                      <div className="text-center">
                        <div className="font-semibold">{selectedCatalogItem.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{selectedCatalogItem.category} › {selectedCatalogItem.subcategory}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Starting Amount</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        data-math="true"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        placeholder="0"
                        autoFocus
                        onKeyDown={e => e.key === "Enter" && handleConfirmCatalogItem()}
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleConfirmCatalogItem} disabled={createItem.isPending}>
                        Add to Inventory
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {step === "update" && selectedCatalogItem && (
                  <div className="flex flex-col gap-6 px-6 pb-6">
                    <div className="flex flex-col items-center gap-3 py-4">
                      <ItemIcon imageUrl={selectedCatalogItem.imageUrl} size="lg" />
                      <div className="text-center">
                        <div className="font-semibold">{selectedCatalogItem.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{selectedCatalogItem.category} › {selectedCatalogItem.subcategory}</div>
                      </div>
                      <div className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded px-3 py-1.5 text-center">
                        This item is already in your inventory (current amount: <span className="font-semibold">{existingItemAmount.toLocaleString()}</span>)
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">New Amount</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        data-math="true"
                        value={updateQuantity}
                        onChange={e => setUpdateQuantity(e.target.value)}
                        placeholder={String(existingItemAmount)}
                        autoFocus
                        onKeyDown={e => e.key === "Enter" && handleConfirmUpdate()}
                      />
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={handleAddAnywayFromUpdate}
                        disabled={updateItem.isPending}
                      >
                        Add anyway
                      </Button>
                      <Button onClick={handleConfirmUpdate} disabled={updateItem.isPending}>
                        {updateItem.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Update Amount
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {step === "custom" && (
                  <div className="flex flex-col gap-4 px-6 pb-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Item Name</label>
                      <Input
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        placeholder="e.g. Special Token"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Starting Amount{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        data-math="true"
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <select
                        value={customCategory || activeCategory || categories?.[0]?.name || ""}
                        onChange={e => setCustomCategory(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {categories?.map(cat => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Item Image{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setCustomImageInputMode("upload")}
                          className={`px-3 py-1 rounded-sm text-xs font-semibold transition-colors ${
                            customImageInputMode === "upload"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomImageInputMode("url")}
                          className={`px-3 py-1 rounded-sm text-xs font-semibold transition-colors ${
                            customImageInputMode === "url"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          Image URL
                        </button>
                      </div>
                      {customImageInputMode === "upload" ? (
                        <div className="flex items-center gap-4">
                          {customImageUrl && (
                            <div className="w-14 h-14 rounded border border-border/50 bg-muted/30 flex items-center justify-center flex-shrink-0">
                              <img src={customImageUrl} alt="" className="w-12 h-12 object-contain" />
                            </div>
                          )}
                          <label className="flex-1 cursor-pointer">
                            <div className="border border-dashed border-border/60 rounded-sm p-3 text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors text-center">
                              <Upload className="w-4 h-4 mx-auto mb-1" />
                              {customImageUrl ? "Change image" : "Upload image"}
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                          </label>
                          {customImageUrl && (
                            <button
                              type="button"
                              onClick={() => setCustomImageUrl("")}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <Input
                          value={customImageUrl}
                          onChange={e => setCustomImageUrl(e.target.value)}
                          placeholder="https://example.com/icon.png"
                        />
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleConfirmCustom} disabled={!customName.trim() || createItem.isPending}>
                        Add Item
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingItems ? (
            <div className="p-8 text-center text-muted-foreground">Loading inventory...</div>
          ) : !items || items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border/50 m-4 rounded-sm">
              No items in this category yet.
            </div>
          ) : (
            <div className="p-2 space-y-5">
              {/* Mobile-only sticky jump links */}
              {subcategoryGroups.length > 1 && (
                <div className={`md:hidden sticky top-16 z-10 -mx-2 px-2 py-1.5 bg-background/80 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100 ${scrolled ? "opacity-60" : "opacity-100"}`}>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {subcategoryGroups.map(([subcat]) => {
                      const label = subcat === "__none__" ? "Other" : subcat;
                      const colors = getCategoryColor(label);
                      return (
                        <a
                          key={subcat}
                          href={`#${subcatToId(label)}`}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0 ${colors.banner}`}
                        >
                          {label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {subcategoryGroups.map(([subcat, groupItems]) => {
                const groupLabel = subcat === "__none__" ? "Other" : subcat;
                const colors = getCategoryColor(groupLabel);
                return (
                <div key={subcat} id={subcatToId(groupLabel)} className={`rounded-lg p-3 scroll-mt-28 md:scroll-mt-20 ${colors.section}`}>
                  <div className="px-2 pb-2 pt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-bold uppercase tracking-wider ${colors.banner}`}>
                      {groupLabel}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 font-mono">({groupItems.length})</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {groupItems.map(item => {
                const goalMatches = goalLinkMap.get(item.name.toLowerCase().trim()) ?? [];
                const activeGoalMatches = goalMatches.filter(m => !m.isCompleted);
                const hasUnmet = activeGoalMatches.some(m => item.currentAmount < m.effectiveRequired);
                const statusAccent = activeGoalMatches.length === 0
                  ? ""
                  : hasUnmet
                    ? "border-l-2 border-l-amber-500/70"
                    : "border-l-2 border-l-emerald-500/60";
                const borderClass = `border ${colors.border} ${statusAccent}`;
                return (
                  <div key={item.id} className={`bg-card/80 rounded-sm p-4 group hover:bg-muted/20 hover:border-border transition-colors ${borderClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => {
                            setEditImageItemId(item.id);
                            setEditImageUrl(item.imageUrl ?? "");
                            setEditImageMode("upload");
                          }}
                          className="relative flex-shrink-0 group/img rounded p-0.5 hover:ring-2 hover:ring-primary/50 transition-all"
                          title="Click to change image"
                        >
                          <ItemIcon imageUrl={item.imageUrl} size="md" />
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 rounded">
                            <PenLine className="w-3.5 h-3.5 text-white" />
                          </span>
                        </button>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm break-words min-w-0">{item.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <InlineEdit 
                          type="number"
                          value={item.currentAmount}
                          onSave={(v) => handleUpdateAmount(item.id, v)}
                          className="font-mono font-bold text-lg text-primary text-right"
                          presets={getPresetsForItem(item.name)}
                        />
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/20 p-1.5 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {activeGoalMatches.length > 0 && (() => {
                      // Build deadline groups (active goals only)
                      const groupMap = new Map<string | null, typeof activeGoalMatches>();
                      for (const match of activeGoalMatches) {
                        const key = match.deadlineEventId;
                        if (!groupMap.has(key)) groupMap.set(key, []);
                        groupMap.get(key)!.push(match);
                      }

                      // Sort groups: deadlined first (ASC by date), null last
                      const sortedGroups = [...groupMap.entries()].sort(([aId], [bId]) => {
                        if (aId === null && bId === null) return 0;
                        if (aId === null) return 1;
                        if (bId === null) return -1;
                        const aDate = eventById.get(aId)?.due?.date ?? "";
                        const bDate = eventById.get(bId)?.due?.date ?? "";
                        return aDate.localeCompare(bDate);
                      });

                      const totalNeeded = activeGoalMatches.reduce((s, m) => s + m.effectiveRequired, 0);
                      const grandSurplus = item.currentAmount - totalNeeded;
                      const grandCovered = grandSurplus >= 0;

                      let cycleCounter = 0;
                      return (
                        <div className="mt-2 space-y-2">
                          {sortedGroups.map(([eventId, groupMatches]) => {
                            const event = eventId ? eventById.get(eventId) : null;
                            const rawDueDate = event?.due
                              ? (event.due.datetime ? event.due.datetime.slice(0, 10) : event.due.date)
                              : null;
                            const dateLabel = rawDueDate ? formatShortDate(rawDueDate) : null;
                            const daysLeftLabel = rawDueDate ? formatDaysLeftLabel(rawDueDate) : null;
                            const cycleNum = dateLabel ? ++cycleCounter : null;
                            const groupNeeded = groupMatches.reduce((s, m) => s + m.effectiveRequired, 0);
                            const groupSurplus = item.currentAmount - groupNeeded;
                            const groupCovered = groupSurplus >= 0;

                            return (
                              <div key={eventId ?? "__none__"} className="space-y-1">
                                {/* Group header — cycle + date label */}
                                {dateLabel && (
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0 tabular-nums whitespace-nowrap">
                                      Cycle #{cycleNum} | {dateLabel}{daysLeftLabel ? ` | ${daysLeftLabel}` : ""}
                                    </span>
                                    <div className="flex-1 h-px bg-border/30" />
                                  </div>
                                )}

                                {/* Active goals in this group */}
                                {groupMatches.map(match => {
                                  const surplus = item.currentAmount - match.effectiveRequired;
                                  const covered = surplus >= 0;
                                  return (
                                    <div key={match.goalId} className="flex items-start justify-between gap-2 text-[11px]">
                                      <button
                                        className="text-muted-foreground min-w-0 break-words text-left hover:text-primary hover:underline transition-colors"
                                        title="Jump to this goal"
                                        onClick={() => setLocation(`/goals?highlight=${match.goalId}`)}
                                      >
                                        {match.goalName}
                                      </button>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="font-mono text-muted-foreground/60">
                                          {item.currentAmount.toLocaleString()}
                                          <span className="mx-0.5">/</span>
                                          {match.effectiveRequired.toLocaleString()}
                                          {match.multiplier > 1 && (
                                            <span className="text-muted-foreground/40 ml-0.5 text-[10px]">
                                              ×{match.multiplier}
                                            </span>
                                          )}
                                        </span>
                                        {covered ? (
                                          <span className="text-emerald-500 font-semibold">+{surplus.toLocaleString()}</span>
                                        ) : (
                                          <span className="text-amber-500 font-semibold font-mono">−{Math.abs(surplus).toLocaleString()}</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Group subtotal — shown whenever this group has ≥2 active goals */}
                                {groupMatches.length >= 2 && (
                                  <div className={`flex items-center justify-between gap-2 text-[11px] border-t mt-1 pt-1 rounded-sm px-1.5 py-0.5 -mx-1.5 ${groupCovered ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                                    <span className={`font-semibold ${groupCovered ? "text-emerald-400/80" : "text-amber-400/80"}`}>
                                      Group total
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-foreground/60">
                                        {item.currentAmount.toLocaleString()}
                                        <span className="mx-0.5 text-muted-foreground/50">/</span>
                                        {groupNeeded.toLocaleString()}
                                      </span>
                                      {groupCovered ? (
                                        <span className="text-emerald-400 font-bold font-mono">+{groupSurplus.toLocaleString()}</span>
                                      ) : (
                                        <span className="text-amber-400 font-bold font-mono">−{Math.abs(groupSurplus).toLocaleString()}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Grand total across all active goals */}
                          {activeGoalMatches.length >= 2 && (
                            <div className={`flex items-center justify-between gap-2 text-xs border-t mt-1.5 pt-1.5 rounded-sm px-1.5 py-1 -mx-1.5 ${grandCovered ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/8"}`}>
                              <span className={`font-bold tracking-tight ${grandCovered ? "text-emerald-400" : "text-amber-400"}`}>
                                Total across {activeGoalMatches.length} goals
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-mono text-foreground/70 font-medium">
                                  {item.currentAmount.toLocaleString()}
                                  <span className="mx-0.5 text-muted-foreground/50">/</span>
                                  {totalNeeded.toLocaleString()}
                                </span>
                                {grandCovered ? (
                                  <span className="text-emerald-400 font-bold font-mono">+{grandSurplus.toLocaleString()}</span>
                                ) : (
                                  <span className="text-amber-400 font-bold font-mono">−{Math.abs(grandSurplus).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Edit item image dialog */}
      <Dialog open={editImageItemId !== null} onOpenChange={(open) => {
        if (!open) {
          setEditImageItemId(null);
          setEditImageUrl("");
          setEditImageMode("upload");
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-4 h-4 text-primary" />
              Change Item Image
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditImageMode("upload")}
                className={`px-3 py-1 rounded-sm text-xs font-semibold transition-colors ${
                  editImageMode === "upload"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground"
                }`}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setEditImageMode("url")}
                className={`px-3 py-1 rounded-sm text-xs font-semibold transition-colors ${
                  editImageMode === "url"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground"
                }`}
              >
                Image URL
              </button>
            </div>
            {editImageMode === "upload" ? (
              <div className="flex items-center gap-4">
                {editImageUrl && (
                  <div className="w-14 h-14 rounded border border-border/50 bg-muted/30 flex items-center justify-center flex-shrink-0">
                    <img src={editImageUrl} alt="" className="w-12 h-12 object-contain" />
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="border border-dashed border-border/60 rounded-sm p-3 text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors text-center">
                    <Upload className="w-4 h-4 mx-auto mb-1" />
                    {editImageUrl ? "Change image" : "Upload image"}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleEditImageFileUpload} />
                </label>
                {editImageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditImageUrl("")}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <Input
                value={editImageUrl}
                onChange={e => setEditImageUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
                autoFocus
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveItemImage} disabled={updateItem.isPending}>
              {updateItem.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
