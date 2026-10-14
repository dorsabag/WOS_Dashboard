import { useState, useMemo, useRef, useEffect, useCallback, Component } from "react";
import { ITEM_CATALOG } from "@/data/item-catalog";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  useGetGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useCreateGoalItem,
  useUpdateGoalItem,
  useDeleteGoalItem,
  useGetItems,
  useCompleteGoal,
  useUncompleteGoal,
  getGetGoalsQueryKey,
  getGetItemsQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Target, CheckCircle2, Circle, X, CalendarDays, Clock, AlertTriangle, Pencil, ImagePlus, Loader2, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { evalMathExpr } from "@/lib/math-expr";
import { getPresetsForItem } from "@/lib/item-presets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, parseISO, isToday, isTomorrow, formatDistanceToNow, addDays, differenceInDays } from "date-fns";
import { getCategoryColor } from "@/lib/category-colors";
import { IconPickerModal } from "@/components/icon-picker-modal";

const GOAL_CATEGORIES = ["CHARMS", "CHIEF GEAR", "HERO GEAR", "HEROES", "PETS", "EXPERTS", "RESEARCH", "BUILDINGS", "MISC"] as const;

function catToId(label: string): string {
  return "cat-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

const URL_RE = /https?:\/\/[^\s<>"]+/g;

function renderDescription(text: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const url = match[0];
    parts.push(
      <a key={match.index} href={url} target="_blank" rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
        onClick={(e) => e.stopPropagation()}
      >{url}</a>
    );
    last = match.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function GoalIconSlot({ imageUrl, isPending, onClick, onRemove }: { imageUrl?: string | null; isPending: boolean; onClick: () => void; onRemove?: () => void }) {
  return (
    <button
      type="button"
      className="relative w-12 h-12 rounded-sm border border-dashed border-border/50 bg-muted/20 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-primary/60 transition-colors group/icon overflow-hidden"
      title={imageUrl ? "Change icon" : "Choose icon"}
      onClick={onClick}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <ImagePlus className="w-5 h-5 text-muted-foreground/50 group-hover/icon:text-primary/70 transition-colors" />
      )}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        </div>
      )}
      {imageUrl && !isPending && (
        <div className="absolute inset-0 hidden group-hover/icon:flex items-center justify-center bg-black/40">
          <ImagePlus className="w-4 h-4 text-white" />
        </div>
      )}
      {imageUrl && !isPending && onRemove && (
        <div
          role="button"
          tabIndex={0}
          title="Remove icon"
          className="absolute top-0.5 right-0.5 hidden group-hover/icon:flex items-center justify-center w-4 h-4 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors z-10 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onRemove(); } }}
        >
          <X className="w-2.5 h-2.5" />
        </div>
      )}
    </button>
  );
}


interface GoalItemAmountEditorProps {
  requiredAmount: number;
  effectiveRequired: number;
  onSave: (val: number) => void;
}

function GoalItemAmountEditor({ requiredAmount, effectiveRequired, onSave }: GoalItemAmountEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [amountInput, setAmountInput] = useState("");

  const handleSave = () => {
    const val = evalMathExpr(amountInput);
    setIsEditing(false);
    if (val === null || val < 0) return;
    onSave(val);
  };

  if (isEditing) {
    return (
      <Input
        className="h-5 w-20 text-xs px-1 font-mono py-0"
        type="text"
        inputMode="numeric"
        data-math="true"
        value={amountInput}
        onChange={e => setAmountInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setIsEditing(false);
        }}
        onBlur={handleSave}
        autoFocus
      />
    );
  }

  return (
    <button
      title="Click to edit required amount"
      className="hover:text-primary hover:underline transition-colors cursor-pointer"
      onClick={() => {
        setAmountInput(String(requiredAmount));
        setIsEditing(true);
      }}
    >
      {effectiveRequired.toLocaleString()}
    </button>
  );
}

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

function formatEventDue(due: TodoistDue): string {
  if (due.datetime) {
    const dt = parseISO(due.datetime);
    if (isToday(dt)) return `Today at ${format(dt, "h:mm a")}`;
    if (isTomorrow(dt)) return `Tomorrow at ${format(dt, "h:mm a")}`;
    return format(dt, "EEE, MMM d · h:mm a");
  }
  const d = parseISO(due.date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d, yyyy");
}

function DeadlineField({
  eventId,
  onSelect,
  onClear,
  calendarEvents,
  calendarError,
}: {
  eventId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  calendarEvents: CalendarEvent[];
  calendarError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedEvent = eventId ? calendarEvents.find(e => e.id === eventId) ?? null : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Deadline (Optional)</label>
        {calendarError && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400/80 font-medium">
            <AlertTriangle className="w-3 h-3" />
            Calendar offline
          </span>
        )}
      </div>

      {eventId ? (
        <div className="flex items-center justify-between gap-2 border border-border/50 rounded-md px-3 py-2 bg-background/50">
          <div className="flex items-center gap-2 min-w-0">
            {selectedEvent?.due?.datetime ? (
              <Clock className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {selectedEvent?.content ?? "Deadline set · calendar unavailable"}
              </div>
              {selectedEvent?.due && (
                <div className="text-xs text-primary font-semibold">{formatEventDue(selectedEvent.due)}</div>
              )}
            </div>
          </div>
          <button type="button" title="Remove deadline" onClick={onClear} className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            disabled={calendarError}
            onClick={() => setOpen(o => !o)}
            className={`w-full flex items-center gap-1.5 text-xs transition-colors px-3 py-2 rounded-md border border-dashed ${
              calendarError
                ? "text-muted-foreground/40 border-border/30 cursor-not-allowed opacity-50"
                : "text-muted-foreground hover:text-primary border-border/50 hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Select a calendar event
          </button>
          {open && (
            <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border/60 rounded-md shadow-lg max-h-52 overflow-y-auto">
              {calendarEvents.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground italic text-center">No events found in Calendar</div>
              ) : (
                calendarEvents.map(event => (
                  <button
                    key={event.id}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      onSelect(event.id);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-primary/10 transition-colors flex items-start gap-2.5 border-b border-border/20 last:border-0"
                  >
                    {event.due?.datetime ? (
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    ) : (
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{event.content}</div>
                      {event.due && (
                        <div className="text-xs text-muted-foreground">{formatEventDue(event.due)}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isLegacy = value && !GOAL_CATEGORIES.includes(value as typeof GOAL_CATEGORIES[number]);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        {GOAL_CATEGORIES.map(cat => (
          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
        ))}
        {isLegacy && (
          <SelectItem value={value} disabled>{value} (legacy)</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

class GoalsErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
          <p className="font-semibold text-destructive">Goals failed to render</p>
          <p className="text-xs text-muted-foreground font-mono break-all">{this.state.error.message}</p>
          <button
            className="text-sm underline text-primary hover:opacity-70"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function safeFormat(date: Date, fmt: string): string {
  try { return format(date, fmt); } catch { return ""; }
}

function GoalsTabInner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const scrolled = useScrolled();
  const { data: goals, isLoading: loadingGoals, isError: goalsError, error: goalsErrorObj } = useGetGoals({
    query: { staleTime: 5 * 60 * 1000, queryKey: getGetGoalsQueryKey() },
  });
  const { data: allItems } = useGetItems({});
  const {
    data: calendarEvents = [],
    isError: calendarError,
  } = useQuery<CalendarEvent[]>({
    queryKey: ["todoist-events"],
    queryFn: fetchCalendarEvents,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const createGoalItem = useCreateGoalItem();
  const updateGoalItem = useUpdateGoalItem();
  const deleteGoalItem = useDeleteGoalItem();
  const completeGoal = useCompleteGoal();
  const uncompleteGoal = useUncompleteGoal();

  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<{ name: string; category: string; description: string; multiplier: number; deadlineEventId: string | null }>({
    name: "", category: GOAL_CATEGORIES[0], description: "", multiplier: 1, deadlineEventId: null,
  });

  const [editingGoal, setEditingGoal] = useState<{
    id: number;
    name: string;
    category: string;
    description: string;
    deadlineEventId: string | null;
  } | null>(null);

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ itemName: "", itemId: undefined as number | undefined, requiredAmount: "" });
  const [presetMultipliers, setPresetMultipliers] = useState<Record<string, number>>({});
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemSearchRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [editingMultiplierId, setEditingMultiplierId] = useState<number | null>(null);
  const [multiplierInput, setMultiplierInput] = useState("");

  const [highlightedGoalId, setHighlightedGoalId] = useState<number | null>(null);
  const goalCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [deadlinePickerGoalId, setDeadlinePickerGoalId] = useState<number | null>(null);
  const [pickerAnchorRect, setPickerAnchorRect] = useState<DOMRect | null>(null);
  const deadlinePickerRef = useRef<HTMLDivElement>(null);

  const [pendingIconUpload, setPendingIconUpload] = useState<{ goalId: number; slot: 1 | 2 } | null>(null);
  const [iconPicker, setIconPicker] = useState<{ goalId: number; slot: 1 | 2 } | null>(null);
  const [completingGoalId, setCompletingGoalId] = useState<number | null>(null);
  const [duplicatingGoalId, setDuplicatingGoalId] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [confirmCompleteGoal, setConfirmCompleteGoal] = useState<{ goalId: number; shortCount: number } | null>(null);

  // manualOverrides: true = user forced collapsed, false = user forced expanded
  const [manualOverrides, setManualOverrides] = useState<Map<number, boolean>>(new Map());

  const TWO_WEEKS = 21;

  const getGoalDeadlineDate = useCallback((goal: { deadlineEventId?: string | null }): Date | null => {
    if (!goal.deadlineEventId) return null;
    const ev = calendarEvents.find(e => e.id === goal.deadlineEventId);
    if (!ev?.due) return null;
    return parseISO(ev.due.datetime ?? ev.due.date);
  }, [calendarEvents]);

  const isGoalCollapsed = useCallback((goal: { id: number; deadlineEventId?: string | null }): boolean => {
    if (manualOverrides.has(goal.id)) return manualOverrides.get(goal.id)!;
    const deadline = getGoalDeadlineDate(goal);
    if (!deadline) return false; // no deadline → always expanded
    return differenceInDays(deadline, new Date()) > TWO_WEEKS;
  }, [manualOverrides, getGoalDeadlineDate]);

  const toggleCollapsed = useCallback((goalId: number, currentlyCollapsed: boolean) => {
    setManualOverrides(prev => {
      const next = new Map(prev);
      next.set(goalId, !currentlyCollapsed);
      return next;
    });
  }, []);

  const handleSaveIcon = (goalId: number, slot: 1 | 2, iconValue: string | null) => {
    setPendingIconUpload({ goalId, slot });
    updateGoal.mutate({
      id: goalId,
      data: slot === 1 ? { iconUrl1: iconValue } : { iconUrl2: iconValue },
    }, {
      onSuccess: () => {
        setPendingIconUpload(null);
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
        toast({ title: iconValue === null ? "Icon removed" : "Icon saved" });
        setIconPicker(null);
      },
      onError: () => {
        setPendingIconUpload(null);
        toast({ title: iconValue === null ? "Failed to remove icon" : "Failed to save icon", variant: "destructive" });
      },
    });
  };

  const handleUploadGoalIcon = (goalId: number, slot: 1 | 2, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string ?? "";
      if (dataUrl) handleSaveIcon(goalId, slot, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const setGoalCardRef = useCallback((id: number) => (el: HTMLDivElement | null) => {
    if (el) goalCardRefs.current.set(id, el);
    else goalCardRefs.current.delete(id);
  }, []);

  useEffect(() => {
    if (!deadlinePickerGoalId) return;
    const handler = (e: MouseEvent) => {
      if (deadlinePickerRef.current && !deadlinePickerRef.current.contains(e.target as Node)) {
        setDeadlinePickerGoalId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [deadlinePickerGoalId]);

  const handleSetDeadline = (goalId: number, eventId: string) => {
    updateGoal.mutate({ id: goalId, data: { deadlineEventId: eventId } }, {
      onSuccess: () => {
        setDeadlinePickerGoalId(null);
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
      },
      onError: () => toast({ title: "Failed to save deadline", variant: "destructive" }),
    });
  };

  const handleRemoveDeadline = (goalId: number) => {
    updateGoal.mutate({ id: goalId, data: { deadlineEventId: null } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() }),
      onError: () => toast({ title: "Failed to remove deadline", variant: "destructive" }),
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("highlight");
    if (!raw) return;
    const id = parseInt(raw, 10);
    if (isNaN(id)) return;
    setHighlightedGoalId(id);
    setLocation("/goals", { replace: true });
  }, [setLocation]);

  useEffect(() => {
    if (!highlightedGoalId || !goals) return;
    const el = goalCardRefs.current.get(highlightedGoalId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlightedGoalId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightedGoalId, goals]);

  const goalsByCategory = useMemo(() => {
    if (!goals) return {};

    const getDeadlineTs = (goal: (typeof goals)[0]): number => {
      if (!goal.deadlineEventId) return Infinity;
      const ev = calendarEvents.find(e => e.id === goal.deadlineEventId);
      if (!ev?.due) return Infinity;
      return parseISO(ev.due.datetime ?? ev.due.date).getTime();
    };

    const grouped = goals.reduce((acc, goal) => {
      if (goal.isCompleted) return acc;
      const cat = goal.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(goal);
      return acc;
    }, {} as Record<string, typeof goals>);

    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => getDeadlineTs(a) - getDeadlineTs(b));
    }

    return grouped;
  }, [goals, calendarEvents]);

  const completedGoals = useMemo(() => {
    if (!goals) return [];
    return goals.filter(g => g.isCompleted);
  }, [goals]);

  const completedCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of completedGoals) {
      const cat = g.category || "Uncategorized";
      map[cat] = (map[cat] ?? 0) + 1;
    }
    return map;
  }, [completedGoals]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.toLowerCase().trim();
    const inventoryItems = allItems ?? [];

    // Items the user has in inventory (matched first)
    const matchedInventory = q
      ? inventoryItems.filter(i => i.name.toLowerCase().includes(q))
      : inventoryItems;

    // Catalog items not already represented in inventory results
    const inventoryNames = new Set(matchedInventory.map(i => i.name.toLowerCase()));
    const catalogOnly = ITEM_CATALOG.filter(c =>
      (!q || c.name.toLowerCase().includes(q)) &&
      !inventoryNames.has(c.name.toLowerCase())
    ).map(c => ({ id: undefined as number | undefined, name: c.name, currentAmount: undefined as number | undefined }));

    return [...matchedInventory, ...catalogOnly].slice(0, 50);
  }, [allItems, itemSearch]);

  const resetNewGoal = () => setNewGoal({ name: "", category: GOAL_CATEGORIES[0], description: "", multiplier: 1, deadlineEventId: null });

  const handleCreateGoal = () => {
    if (!newGoal.name || !newGoal.category) return;
    createGoal.mutate({
      data: {
        name: newGoal.name,
        category: newGoal.category,
        description: newGoal.description || undefined,
        multiplier: newGoal.multiplier,
      }
    }, {
      onSuccess: (createdGoal) => {
        const finish = () => {
          setIsAddGoalOpen(false);
          resetNewGoal();
          queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          toast({ title: "Goal Created" });
        };
        if (newGoal.deadlineEventId) {
          updateGoal.mutate({ id: createdGoal.id, data: { deadlineEventId: newGoal.deadlineEventId } }, {
            onSuccess: finish,
            onError: () => {
              finish();
              toast({ title: "Goal created, but deadline could not be saved", variant: "destructive" });
            },
          });
        } else {
          finish();
        }
      }
    });
  };

  const handleDuplicateGoal = async (goal: {
    id: number; name: string; category: string; description?: string | null;
    multiplier: number; iconUrl1?: string | null; iconUrl2?: string | null;
    deadlineEventId?: string | null;
    goalItems?: Array<{ itemId?: number | null; itemName: string; requiredAmount: number }>;
  }) => {
    setDuplicatingGoalId(goal.id);
    try {
      const created = await createGoal.mutateAsync({
        data: {
          name: goal.name,
          category: goal.category,
          description: goal.description || undefined,
          multiplier: goal.multiplier,
          iconUrl1: goal.iconUrl1 || undefined,
          iconUrl2: goal.iconUrl2 || undefined,
        }
      });
      if (goal.deadlineEventId) {
        await updateGoal.mutateAsync({ id: created.id, data: { deadlineEventId: goal.deadlineEventId } });
      }
      if (goal.goalItems?.length) {
        await Promise.all(goal.goalItems.map(item =>
          createGoalItem.mutateAsync({
            data: {
              goalId: created.id,
              itemName: item.itemName,
              itemId: item.itemId ?? undefined,
              requiredAmount: item.requiredAmount,
            }
          })
        ));
      }
      queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: "Goal duplicated" });
    } catch {
      toast({ title: "Failed to duplicate goal", variant: "destructive" });
    } finally {
      setDuplicatingGoalId(null);
    }
  };

  const openEditGoal = (goal: { id: number; name: string; category: string; description?: string | null; deadlineEventId?: string | null }) => {
    setEditingGoal({
      id: goal.id,
      name: goal.name,
      category: goal.category,
      description: goal.description ?? "",
      deadlineEventId: goal.deadlineEventId ?? null,
    });
  };

  const handleSaveEditGoal = () => {
    if (!editingGoal || !editingGoal.name || !editingGoal.category) return;
    updateGoal.mutate({
      id: editingGoal.id,
      data: {
        name: editingGoal.name,
        category: editingGoal.category,
        description: editingGoal.description,
        deadlineEventId: editingGoal.deadlineEventId,
      }
    }, {
      onSuccess: () => {
        setEditingGoal(null);
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Goal Updated" });
      },
      onError: () => toast({ title: "Failed to update goal", variant: "destructive" }),
    });
  };

  const handleDeleteGoal = (id: number) => {
    if (!confirm("Delete this goal?")) return;
    deleteGoal.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const handleSaveMultiplier = (goalId: number) => {
    const val = evalMathExpr(multiplierInput);
    if (val === null || val < 1) return;
    updateGoal.mutate({ id: goalId, data: { multiplier: val } }, {
      onSuccess: () => {
        setEditingMultiplierId(null);
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
      }
    });
  };

  const openMultiplierEdit = (goalId: number, current: number) => {
    setEditingMultiplierId(goalId);
    setMultiplierInput(String(current));
  };

  const handleCreateGoalItem = () => {
    if (!activeGoalId || !newItem.itemName || !newItem.requiredAmount) return;
    const reqAmount = evalMathExpr(newItem.requiredAmount);
    if (reqAmount === null || reqAmount < 0) return;

    createGoalItem.mutate({
      data: {
        goalId: activeGoalId,
        itemName: newItem.itemName,
        itemId: newItem.itemId,
        requiredAmount: reqAmount
      }
    }, {
      onSuccess: () => {
        setIsAddItemOpen(false);
        setNewItem({ itemName: "", itemId: undefined, requiredAmount: "" });
        setItemSearch("");
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
      }
    });
  };

  const handleSaveGoalItemAmountValue = (itemId: number, val: number) => {
    updateGoalItem.mutate({ id: itemId, data: { requiredAmount: val } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
      }
    });
  };

  const handleDeleteGoalItem = (id: number) => {
    if (!confirm("Remove this requirement?")) return;
    deleteGoalItem.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
      }
    });
  };

  const doCompleteGoal = (goalId: number, isCompleted: boolean) => {
    setCompletingGoalId(goalId);
    const mutation = isCompleted ? uncompleteGoal : completeGoal;
    mutation.mutate({ id: goalId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: isCompleted ? "Goal restored" : "Goal completed — inventory updated" });
      },
      onError: () => {
        toast({ title: isCompleted ? "Failed to restore goal" : "Failed to complete goal", variant: "destructive" });
      },
      onSettled: () => setCompletingGoalId(null),
    });
  };

  const handleToggleComplete = (goalId: number, isCompleted: boolean) => {
    if (completingGoalId !== null) return;
    if (!isCompleted) {
      const goal = goals?.find(g => g.id === goalId);
      const shortCount = goal?.goalItems.filter(item => item.remaining > 0).length ?? 0;
      if (shortCount > 0) {
        setConfirmCompleteGoal({ goalId, shortCount });
        return;
      }
    }
    doCompleteGoal(goalId, isCompleted);
  };

  const openAddItemDialog = (goalId: number) => {
    setActiveGoalId(goalId);
    setNewItem({ itemName: "", itemId: undefined, requiredAmount: "" });
    setItemSearch("");
    setShowItemDropdown(false);
    setIsAddItemOpen(true);
  };

  const selectInventoryItem = (item: { id?: number; name: string }) => {
    setNewItem(prev => ({ ...prev, itemName: item.name, itemId: item.id }));
    setItemSearch(item.name);
    setShowItemDropdown(false);
  };

  useEffect(() => {
    if (!isAddItemOpen) {
      setShowItemDropdown(false);
      setPresetMultipliers({});
    }
  }, [isAddItemOpen]);

  if (loadingGoals) {
    return <Skeleton className="h-96 w-full bg-card/50" />;
  }

  if (goalsError) {
    return (
      <div className="rounded border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
        <p className="font-semibold text-destructive">Failed to load goals</p>
        <p className="text-xs text-muted-foreground font-mono break-all">
          {(goalsErrorObj as Error)?.message ?? "Unknown error"}
        </p>
        <button
          className="text-sm underline text-primary hover:opacity-70"
          onClick={() => queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() })}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
          <Target className="w-6 h-6" /> Strategic Objectives
        </h2>
        <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Goal Name</label>
                <Input 
                  value={newGoal.name} 
                  onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} 
                  placeholder="e.g. Max out Mythic Hero"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <CategorySelect value={newGoal.category} onChange={v => setNewGoal({ ...newGoal, category: v })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea 
                  value={newGoal.description} 
                  onChange={e => setNewGoal({ ...newGoal, description: e.target.value })} 
                  placeholder="Short description..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Repeat (×)</label>
                <p className="text-xs text-muted-foreground">How many times to apply this goal. E.g. × 3 to max out 3 heroes.</p>
                <Input 
                  type="number"
                  min={1}
                  value={newGoal.multiplier} 
                  onChange={e => setNewGoal({ ...newGoal, multiplier: Math.max(1, parseInt(e.target.value) || 1) })} 
                />
              </div>
              <DeadlineField
                eventId={newGoal.deadlineEventId}
                onSelect={id => setNewGoal({ ...newGoal, deadlineEventId: id })}
                onClear={() => setNewGoal({ ...newGoal, deadlineEventId: null })}
                calendarEvents={calendarEvents}
                calendarError={calendarError}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateGoal} disabled={!newGoal.name || !newGoal.category || createGoal.isPending}>
                Create Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(goalsByCategory).length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-sm">
          No active goals. Set your first objective to begin tracking.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Mobile-only sticky jump links */}
          {Object.keys(goalsByCategory).length > 1 && (
            <div className={`md:hidden sticky top-16 z-10 -mx-4 px-4 py-1.5 bg-background/80 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100 ${scrolled ? "opacity-60" : "opacity-100"}`}>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {Object.keys(goalsByCategory).map((category) => {
                  const colors = getCategoryColor(category);
                  return (
                    <a
                      key={category}
                      href={`#${catToId(category)}`}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0 ${colors.banner}`}
                    >
                      {category}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          {Object.entries(goalsByCategory).length === 0 && completedGoals.length > 0 && (
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-sm text-sm">
              All goals completed! See the Completed section below.
            </div>
          )}

          {Object.entries(goalsByCategory).map(([category, catGoals]) => {
            const colors = getCategoryColor(category);
            return (
            <div key={category} id={catToId(category)} className={`space-y-4 rounded-lg p-4 scroll-mt-28 md:scroll-mt-20 ${colors.section}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-bold uppercase tracking-wider ${colors.banner}`}>
                  {category}
                </div>
                {(completedCountByCategory[category] ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground/70 font-medium">
                    {completedCountByCategory[category]} completed
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {catGoals.map(goal => {
                  const multiplier = goal.multiplier ?? 1;
                  const collapsed = isGoalCollapsed(goal);
                  const deadlineDate = getGoalDeadlineDate(goal);
                  const daysUntilDeadline = deadlineDate ? differenceInDays(deadlineDate, new Date()) : null;

                  return (
                    <Card
                      key={goal.id}
                      ref={setGoalCardRef(goal.id)}
                      className={`bg-card/40 backdrop-blur transition-all duration-300 ${colors.border} ${goal.isCompleted ? 'opacity-70' : ''} ${collapsed ? 'opacity-80' : ''} ${highlightedGoalId === goal.id ? 'ring-2 ring-primary shadow-[0_0_16px_rgba(var(--color-primary),0.4)]' : ''}`}
                    >
                      <CardHeader className="pb-2 flex flex-row items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                            <button
                              title={goal.isCompleted ? "Mark as not complete (restores inventory)" : "Mark as complete (deducts inventory)"}
                              disabled={completingGoalId === goal.id}
                              onClick={() => handleToggleComplete(goal.id, goal.isCompleted)}
                              className="shrink-0 transition-opacity hover:opacity-70 disabled:opacity-40"
                            >
                              {completingGoalId === goal.id
                                ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                : goal.isCompleted
                                  ? <CheckCircle2 className="w-5 h-5 text-primary" />
                                  : <Circle className="w-5 h-5 text-muted-foreground" />
                              }
                            </button>
                            <span className="break-words min-w-0">{goal.name}</span>

                            {editingMultiplierId === goal.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <span className="text-muted-foreground text-sm">×</span>
                                <Input
                                  className="h-6 w-16 text-xs px-1 font-mono"
                                  type="text"
                                  inputMode="numeric"
                                  data-math="true"
                                  value={multiplierInput}
                                  onChange={e => setMultiplierInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") handleSaveMultiplier(goal.id);
                                    if (e.key === "Escape") setEditingMultiplierId(null);
                                  }}
                                  autoFocus
                                />
                                <button
                                  className="text-primary hover:opacity-70 text-xs px-1 py-0.5 border border-primary/30 rounded"
                                  onClick={() => handleSaveMultiplier(goal.id)}
                                >✓</button>
                                <button
                                  className="text-muted-foreground hover:opacity-70 text-xs px-1 py-0.5"
                                  onClick={() => setEditingMultiplierId(null)}
                                ><X className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <button
                                title="Click to change multiplier"
                                onClick={() => openMultiplierEdit(goal.id, multiplier)}
                                className={`ml-1 text-xs font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                  multiplier > 1
                                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                    : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/60"
                                }`}
                              >
                                ×{multiplier}
                              </button>
                            )}
                          </CardTitle>
                          {goal.description && !collapsed && (
                            <div className="text-sm text-muted-foreground mt-1">{renderDescription(goal.description)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditGoal(goal)}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Edit goal"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateGoal(goal)}
                            disabled={duplicatingGoalId === goal.id}
                            className="text-muted-foreground hover:text-primary transition-colors p-1 disabled:opacity-50"
                            title="Duplicate goal"
                          >
                            {duplicatingGoalId === goal.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Copy className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleCollapsed(goal.id, collapsed)}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title={collapsed ? "Expand goal" : "Collapse goal"}
                          >
                            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </button>
                        </div>
                      </CardHeader>

                      {/* Collapsed summary row */}
                      {collapsed ? (
                        <CardContent className="pt-0 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>PROGRESS</span>
                                <span>{goal.completionPct.toFixed(0)}%</span>
                              </div>
                              <Progress value={goal.completionPct} className="h-1.5" />
                            </div>
                            {daysUntilDeadline !== null && (
                              <div className="shrink-0 flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/40 border border-border/40 px-2 py-1 rounded-md">
                                <CalendarDays className="w-3 h-3 text-primary/60" />
                                {daysUntilDeadline < 0
                                  ? <span className="text-destructive">Overdue</span>
                                  : daysUntilDeadline === 0
                                  ? <span className="text-amber-400">Today</span>
                                  : daysUntilDeadline === 1
                                  ? <span className="text-amber-400">Tomorrow</span>
                                  : <span>in {daysUntilDeadline}d</span>
                                }
                              </div>
                            )}
                          </div>
                        </CardContent>
                      ) : (
                      <CardContent className="pt-0 space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                            <span>PROGRESS</span>
                            <span>{goal.completionPct.toFixed(0)}%</span>
                          </div>
                          <Progress value={goal.completionPct} className="h-2" />
                        </div>

                        <div className="space-y-2 mt-4 bg-background/50 rounded p-3 border border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Required Materials</span>
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => openAddItemDialog(goal.id)}>
                              <Plus className="w-3 h-3 mr-1" /> Add
                            </Button>
                          </div>

                          {goal.goalItems.length === 0 ? (
                            <div className="text-xs text-muted-foreground italic">No materials specified.</div>
                          ) : (
                            <ul className="space-y-2">
                              {goal.goalItems.map(item => {
                                const effectiveRequired = item.requiredAmount * multiplier;
                                return (
                                  <li key={item.id} className="flex items-center justify-between text-sm group">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {item.isAchieved ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                      ) : (
                                        <Circle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                      )}
                                      <span className={`truncate ${item.isAchieved ? "text-muted-foreground line-through" : ""}`}>
                                        {item.itemName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="font-mono text-xs flex items-center">
                                        <span className={item.isAchieved ? "text-primary" : "text-muted-foreground"}>
                                          {item.currentAmount.toLocaleString()}
                                        </span>
                                        <span className="text-muted-foreground/50 mx-1">/</span>
                                        <GoalItemAmountEditor
                                          requiredAmount={item.requiredAmount}
                                          effectiveRequired={effectiveRequired}
                                          onSave={val => handleSaveGoalItemAmountValue(item.id, val)}
                                        />
                                        {multiplier > 1 && (
                                          <span className="text-muted-foreground/40 ml-1 text-[10px]">
                                            ({item.requiredAmount.toLocaleString()}×{multiplier})
                                          </span>
                                        )}
                                      </div>
                                      {item.remaining > 0 && (
                                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-none font-mono">
                                          -{item.remaining.toLocaleString()}
                                        </Badge>
                                      )}
                                      <button 
                                        onClick={() => handleDeleteGoalItem(item.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/20 p-1 rounded"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>

                        {/* Deadline section */}
                        {(() => {
                          const deadlineEvent = goal.deadlineEventId
                            ? calendarEvents.find(e => e.id === goal.deadlineEventId)
                            : null;
                          const isPickerOpen = deadlinePickerGoalId === goal.id;
                          const calendarOffline = calendarError;

                          return (
                            <div className="mt-3 pt-3 border-t border-border/30 flex items-start gap-3">
                              <div className="w-1/2 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Deadline</span>
                                {calendarOffline && (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-400/80 font-medium">
                                    <AlertTriangle className="w-3 h-3" />
                                    Calendar offline
                                  </span>
                                )}
                              </div>

                              {goal.deadlineEventId ? (
                                <div className="mt-2 flex items-start justify-between gap-2">
                                  {deadlineEvent ? (
                                    <div className={`flex items-center gap-2 min-w-0 ${calendarOffline ? "opacity-60" : ""}`}>
                                      {deadlineEvent.due?.datetime ? (
                                        <Clock className="w-4 h-4 text-primary shrink-0" />
                                      ) : (
                                        <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                                      )}
                                      <div className="min-w-0">
                                        <div className="text-sm font-bold text-foreground truncate">{deadlineEvent.content}</div>
                                        <div className="text-xs text-primary font-semibold">
                                          {deadlineEvent.due ? formatEventDue(deadlineEvent.due) : "No date"}
                                        </div>
                                      </div>
                                    </div>
                                  ) : calendarOffline ? (
                                    <div className="flex items-center gap-2 text-muted-foreground/50">
                                      <CalendarDays className="w-4 h-4 shrink-0" />
                                      <span className="text-xs italic">Deadline set · calendar unavailable</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground/60">
                                      <CalendarDays className="w-4 h-4 shrink-0" />
                                      <span className="text-xs italic">Deadline event removed from calendar</span>
                                    </div>
                                  )}
                                  <button
                                    title="Remove deadline"
                                    onClick={() => handleRemoveDeadline(goal.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-1.5">
                                  <button
                                    disabled={calendarOffline}
                                    title={calendarOffline ? "Calendar sync is unavailable" : undefined}
                                    onMouseDown={e => {
                                      e.stopPropagation();
                                      if (calendarOffline) return;
                                      if (deadlinePickerGoalId === goal.id) {
                                        setDeadlinePickerGoalId(null);
                                        setPickerAnchorRect(null);
                                      } else {
                                        setDeadlinePickerGoalId(goal.id);
                                        setPickerAnchorRect(e.currentTarget.getBoundingClientRect());
                                      }
                                    }}
                                    className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded border border-dashed ${
                                      calendarOffline
                                        ? "text-muted-foreground/40 border-border/30 cursor-not-allowed opacity-50"
                                        : "text-muted-foreground hover:text-primary border-border/50 hover:border-primary/40 hover:bg-primary/5"
                                    }`}
                                  >
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    Add deadline
                                  </button>
                                </div>
                              )}
                              </div>

                              <div className="w-1/2 min-w-0 flex flex-col items-end justify-end">
                                <div className="flex items-center gap-2">
                                  <GoalIconSlot
                                    imageUrl={goal.iconUrl1}
                                    isPending={pendingIconUpload?.goalId === goal.id && pendingIconUpload.slot === 1}
                                    onClick={() => setIconPicker({ goalId: goal.id, slot: 1 })}
                                    onRemove={goal.iconUrl1 ? () => handleSaveIcon(goal.id, 1, null) : undefined}
                                  />
                                  <GoalIconSlot
                                    imageUrl={goal.iconUrl2}
                                    isPending={pendingIconUpload?.goalId === goal.id && pendingIconUpload.slot === 2}
                                    onClick={() => setIconPicker({ goalId: goal.id, slot: 2 })}
                                    onRemove={goal.iconUrl2 ? () => handleSaveIcon(goal.id, 2, null) : undefined}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                      )} {/* end expanded branch */}
                    </Card>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Completed Goals Section */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-2 w-full group"
          >
            <div className="flex-1 h-px bg-border/40" />
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider whitespace-nowrap px-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary/50" />
              {completedGoals.length} Completed
              <span className="text-muted-foreground/40 text-[10px]">({showCompleted ? "hide" : "show"})</span>
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </button>

          {showCompleted && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {completedGoals.map(goal => {
                const catColors = getCategoryColor(goal.category);
                const lc = goal.lastCompletion ?? null;
                const completedDate = lc?.completedAt ? parseISO(lc.completedAt) : null;
                const consumedItems = lc?.itemsConsumed ?? null;
                return (
                  <Card
                    key={goal.id}
                    className={`bg-card/20 backdrop-blur opacity-60 transition-all duration-300 ${catColors.border}`}
                  >
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                          <button
                            title="Restore goal (adds inventory back)"
                            disabled={completingGoalId === goal.id}
                            onClick={() => handleToggleComplete(goal.id, true)}
                            className="shrink-0 transition-opacity hover:opacity-70 disabled:opacity-40"
                          >
                            {completingGoalId === goal.id
                              ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                              : <CheckCircle2 className="w-5 h-5 text-primary/60" />
                            }
                          </button>
                          <span className="break-words min-w-0 line-through text-muted-foreground">{goal.name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${catColors.banner}`}>{goal.category}</span>
                        </CardTitle>
                        {goal.description && (
                          <div className="text-sm text-muted-foreground/60 mt-1 line-through">{goal.description}</div>
                        )}
                        {completedDate && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-primary/60 font-medium">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span title={format(completedDate, "PPpp")}>
                              Completed {formatDistanceToNow(completedDate, { addSuffix: true })} · {format(completedDate, "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-muted-foreground/50 hover:text-destructive transition-colors p-1"
                          title="Delete goal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardHeader>
                    {consumedItems && consumedItems.length > 0 ? (
                      <CardContent className="pt-0">
                        <div className="bg-background/30 rounded p-3 border border-border/20">
                          <span className="text-xs font-semibold uppercase text-muted-foreground/60 block mb-2">Materials consumed</span>
                          <ul className="space-y-1.5">
                            {consumedItems.map((item, i) => (
                              <li key={i} className="flex items-center justify-between text-sm text-muted-foreground/70">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CheckCircle2 className="w-3 h-3 text-primary/40 shrink-0" />
                                  <span className="truncate">{item.itemName}</span>
                                </div>
                                <span className="font-mono text-xs text-muted-foreground/50 shrink-0 ml-2">
                                  {item.amountConsumed.toLocaleString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    ) : goal.goalItems.length > 0 && !lc ? (
                      <CardContent className="pt-0">
                        <div className="bg-background/30 rounded p-3 border border-border/20">
                          <span className="text-xs font-semibold uppercase text-muted-foreground/60 block mb-2">Materials consumed</span>
                          <ul className="space-y-1.5">
                            {goal.goalItems.map(item => {
                              const effectiveRequired = item.requiredAmount * (goal.multiplier ?? 1);
                              return (
                                <li key={item.id} className="flex items-center justify-between text-sm text-muted-foreground/70">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <CheckCircle2 className="w-3 h-3 text-primary/40 shrink-0" />
                                    <span className="truncate">{item.itemName}</span>
                                  </div>
                                  <span className="font-mono text-xs text-muted-foreground/50 shrink-0 ml-2">
                                    {effectiveRequired.toLocaleString()}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </CardContent>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Material Requirement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Material</label>
              <p className="text-xs text-muted-foreground">Search your inventory or type a custom name.</p>
              <div className="relative">
                <Input 
                  ref={itemSearchRef}
                  value={itemSearch}
                  onChange={e => {
                    setItemSearch(e.target.value);
                    setNewItem(prev => ({ ...prev, itemName: e.target.value, itemId: undefined }));
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => setShowItemDropdown(true)}
                  placeholder="Search items..."
                />
                {newItem.itemId && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    linked
                  </span>
                )}
                {showItemDropdown && filteredItems.length > 0 && itemSearch.length > 0 && !newItem.itemId && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border/60 rounded shadow-lg max-h-52 overflow-y-auto">
                    {filteredItems.map(item => (
                      <button
                        key={item.id ?? `cat:${item.name}`}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between gap-2"
                        onMouseDown={e => {
                          e.preventDefault();
                          selectInventoryItem(item);
                        }}
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {item.currentAmount !== undefined ? item.currentAmount.toLocaleString() : <span className="italic opacity-50">not in inventory</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {newItem.itemId && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => {
                    setNewItem(prev => ({ ...prev, itemId: undefined }));
                    setItemSearch(newItem.itemName);
                  }}
                >
                  Clear link — use custom name instead
                </button>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Required Amount <span className="text-muted-foreground font-normal">(per repeat)</span></label>
              <Input 
                ref={amountInputRef}
                type="text"
                inputMode="numeric"
                data-math="true"
                value={newItem.requiredAmount} 
                onChange={e => setNewItem({ ...newItem, requiredAmount: e.target.value })} 
                placeholder="0"
              />
              {(() => {
                const presets = getPresetsForItem(newItem.itemName);
                if (!presets.length) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-muted-foreground shrink-0">Quick:</span>
                    {presets.map(p => {
                      const key = p.presetName + p.amount;
                      const mult = presetMultipliers[key] ?? 1;
                      return (
                        <div key={key} className="flex items-center">
                          <button
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              setNewItem(prev => ({ ...prev, requiredAmount: String(p.amount * mult) }));
                              amountInputRef.current?.focus();
                            }}
                            className="text-xs px-2.5 py-0.5 rounded-l-full bg-muted/60 border border-border/50 border-r-0 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            {p.presetName} — {(p.amount * mult).toLocaleString()}
                          </button>
                          <button
                            type="button"
                            onMouseDown={e => { e.preventDefault(); setPresetMultipliers(prev => ({ ...prev, [key]: Math.max(1, (prev[key] ?? 1) - 1) })); }}
                            disabled={mult <= 1}
                            className="text-[10px] w-5 py-0.5 bg-muted/40 border-y border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 text-center leading-none"
                            aria-label="Decrease multiplier"
                          >−</button>
                          <span className="text-[10px] px-1 py-0.5 bg-muted/30 border-y border-border/50 text-muted-foreground font-mono select-none leading-none flex items-center">×{mult}</span>
                          <button
                            type="button"
                            onMouseDown={e => { e.preventDefault(); setPresetMultipliers(prev => ({ ...prev, [key]: (prev[key] ?? 1) + 1 })); }}
                            className="text-[10px] w-5 py-0.5 rounded-r-full bg-muted/40 border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors text-center leading-none"
                            aria-label="Increase multiplier"
                          >+</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleCreateGoalItem} 
              disabled={!newItem.itemName || !newItem.requiredAmount || createGoalItem.isPending}
            >
              Add Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={editingGoal !== null} onOpenChange={open => { if (!open) setEditingGoal(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Goal Name</label>
                <Input
                  value={editingGoal.name}
                  onChange={e => setEditingGoal({ ...editingGoal, name: e.target.value })}
                  placeholder="e.g. Max out Mythic Hero"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <CategorySelect value={editingGoal.category} onChange={v => setEditingGoal({ ...editingGoal, category: v })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={editingGoal.description}
                  onChange={e => setEditingGoal({ ...editingGoal, description: e.target.value })}
                  placeholder="Short description..."
                />
              </div>
              <DeadlineField
                eventId={editingGoal.deadlineEventId}
                onSelect={id => setEditingGoal({ ...editingGoal, deadlineEventId: id })}
                onClear={() => setEditingGoal({ ...editingGoal, deadlineEventId: null })}
                calendarEvents={calendarEvents}
                calendarError={calendarError}
              />

              {(() => {
                const liveGoal = goals?.find(g => g.id === editingGoal.id);
                if (!liveGoal) return null;
                const multiplier = liveGoal.multiplier ?? 1;
                return (
                  <div className="space-y-2 bg-background/50 rounded p-3 border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Required Materials</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => openAddItemDialog(liveGoal.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    {liveGoal.goalItems.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic">No materials specified.</div>
                    ) : (
                      <ul className="space-y-2">
                        {liveGoal.goalItems.map(item => {
                          const effectiveRequired = item.requiredAmount * multiplier;
                          return (
                            <li key={item.id} className="flex items-center justify-between text-sm group">
                              <span className="truncate min-w-0">{item.itemName}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="font-mono text-xs flex items-center text-muted-foreground">
                                  <GoalItemAmountEditor
                                    requiredAmount={item.requiredAmount}
                                    effectiveRequired={effectiveRequired}
                                    onSave={val => handleSaveGoalItemAmountValue(item.id, val)}
                                  />
                                </div>
                                <button
                                  onClick={() => handleDeleteGoalItem(item.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/20 p-1 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={handleSaveEditGoal}
              disabled={!editingGoal?.name || !editingGoal?.category || updateGoal.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Short-materials confirmation dialog */}
      <Dialog open={confirmCompleteGoal !== null} onOpenChange={open => { if (!open) setConfirmCompleteGoal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Missing Materials
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            You're short on <span className="font-semibold text-foreground">{confirmCompleteGoal?.shortCount} item{confirmCompleteGoal?.shortCount !== 1 ? "s" : ""}</span>. Completing this goal will zero out those missing amounts. Do you want to proceed?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmCompleteGoal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirmCompleteGoal) return;
                setConfirmCompleteGoal(null);
                doCompleteGoal(confirmCompleteGoal.goalId, false);
              }}
            >
              Force Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deadline event picker — rendered via portal to escape card stacking context */}
      {deadlinePickerGoalId !== null && pickerAnchorRect && createPortal(
        <div
          ref={deadlinePickerRef}
          style={{
            position: "fixed",
            top: pickerAnchorRect.bottom + 4,
            left: pickerAnchorRect.left,
            width: 288,
            zIndex: 9999,
          }}
          className="bg-card border border-border/60 rounded-md shadow-2xl max-h-64 overflow-y-auto"
        >
          <div className="px-3 py-2 border-b border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pick a Calendar Event</p>
          </div>
          {calendarEvents.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground italic text-center">No events found in Calendar</div>
          ) : (
            calendarEvents.map(event => (
              <button
                key={event.id}
                onMouseDown={e => { e.preventDefault(); handleSetDeadline(deadlinePickerGoalId, event.id); }}
                className="w-full text-left px-3 py-2.5 hover:bg-primary/10 transition-colors flex items-start gap-2.5 border-b border-border/20 last:border-0"
              >
                {event.due?.datetime ? (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{event.content}</div>
                  {event.due && (
                    <div className="text-xs text-muted-foreground">{formatEventDue(event.due)}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>,
        document.body
      )}

      <IconPickerModal
        open={iconPicker !== null}
        onClose={() => setIconPicker(null)}
        isPending={iconPicker !== null && pendingIconUpload?.goalId === iconPicker.goalId && pendingIconUpload?.slot === iconPicker.slot}
        currentImageUrl={iconPicker && goals
          ? (goals.find(g => g.id === iconPicker.goalId)?.[iconPicker.slot === 1 ? "iconUrl1" : "iconUrl2"] ?? null)
          : null
        }
        onSelectUrl={(url) => {
          if (iconPicker) handleSaveIcon(iconPicker.goalId, iconPicker.slot, url);
        }}
        onUpload={(file) => {
          if (iconPicker) handleUploadGoalIcon(iconPicker.goalId, iconPicker.slot, file);
        }}
        onRemove={() => {
          if (iconPicker) handleSaveIcon(iconPicker.goalId, iconPicker.slot, null);
        }}
      />
    </div>
  );
}

export default function GoalsTab() {
  return (
    <GoalsErrorBoundary>
      <GoalsTabInner />
    </GoalsErrorBoundary>
  );
}
