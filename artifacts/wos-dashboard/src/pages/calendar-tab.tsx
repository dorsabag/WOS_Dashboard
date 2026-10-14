import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isPast, isToday, isTomorrow, differenceInHours } from "date-fns";
import { CalendarDays, Clock, RefreshCw, AlertTriangle, Repeat, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

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

async function fetchEvents(): Promise<CalendarEvent[]> {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const res = await fetch(`${base}/api/todoist/events`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function formatDueDate(due: TodoistDue): string {
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

function getEventDate(due: TodoistDue): Date {
  return parseISO(due.datetime ?? due.date);
}

function isEventPast(due: TodoistDue): boolean {
  const d = getEventDate(due);
  return isPast(d) && !isToday(d);
}

function isUrgent(due: TodoistDue): boolean {
  if (!due.datetime) return isToday(parseISO(due.date));
  return differenceInHours(parseISO(due.datetime), new Date()) <= 24;
}

const PRIORITY_COLORS: Record<number, string> = {
  4: "bg-destructive/20 border-destructive/50 text-destructive",
  3: "bg-orange-500/20 border-orange-500/50 text-orange-400",
  2: "bg-blue-500/20 border-blue-500/50 text-blue-400",
  1: "",
};

const PRIORITY_LABELS: Record<number, string> = {
  4: "P1",
  3: "P2",
  2: "P3",
  1: "P4",
};

function EventCard({ event }: { event: CalendarEvent }) {
  const past = event.due ? isEventPast(event.due) : false;
  const urgent = event.due ? isUrgent(event.due) : false;
  const recurring = event.due?.is_recurring ?? false;
  const priorityColor = PRIORITY_COLORS[event.priority] ?? "";

  return (
    <div
      className={`rounded border px-4 py-3 transition-all ${
        past
          ? "border-border/20 bg-muted/10 opacity-50"
          : urgent
          ? "border-primary/40 bg-primary/5 shadow-[0_0_8px_rgba(var(--color-primary),0.1)]"
          : "border-border/30 bg-card/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${past ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {event.content}
            </span>
            {recurring && (
              <Repeat className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            )}
            {event.priority > 1 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${priorityColor}`}>
                {PRIORITY_LABELS[event.priority]}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {event.due ? (
            <div className={`flex items-center gap-1.5 text-xs font-mono ${
              past ? "text-muted-foreground/40" : urgent ? "text-primary font-semibold" : "text-muted-foreground"
            }`}>
              {event.due.datetime ? (
                <Clock className="w-3 h-3" />
              ) : (
                <CalendarDays className="w-3 h-3" />
              )}
              <span className="whitespace-nowrap">{formatDueDate(event.due)}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40 italic">No date</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarTab() {
  const [showPast, setShowPast] = useState(false);

  const { data: events, isLoading, isError, error, refetch, isFetching } = useQuery<CalendarEvent[], Error>({
    queryKey: ["todoist-events"],
    queryFn: fetchEvents,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const upcoming = events?.filter((e) => !e.due || !isEventPast(e.due)) ?? [];
  const past = events?.filter((e) => e.due && isEventPast(e.due)) ?? [];
  const noDue = upcoming.filter((e) => !e.due);
  const withDue = upcoming.filter((e) => e.due);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
            <CalendarDays className="w-6 h-6" />
            Game Calendar
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Synced from Todoist · Whiteout Survival project</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded border border-border/40 hover:border-border/70 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-card/50" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive text-sm">Could not load events</p>
              <p className="text-sm text-muted-foreground mt-1">{error?.message}</p>
              {error?.message?.includes("not configured") && (
                <p className="text-xs text-muted-foreground mt-2">
                  The Todoist integration needs to be authorized. Complete the OAuth setup to connect your account.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && events && (
        <>
          {withDue.length === 0 && noDue.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded">
              No upcoming events found in the "Whiteout Survival" Todoist project.
            </div>
          ) : (
            <div className="space-y-2">
              {withDue.length === 0 && (
                <p className="text-sm text-muted-foreground italic px-1">No upcoming scheduled events.</p>
              )}
              {withDue.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}

          {noDue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 border-t border-border/30 pt-4">
                <CalendarDays className="w-3.5 h-3.5" />
                No Date Set ({noDue.length})
              </div>
              {noDue.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowPast((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors border-t border-border/20 pt-4 w-full text-left"
              >
                {showPast ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Past Events ({past.length})
              </button>
              {showPast && past.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground/40 pt-2 border-t border-border/20">
            <span>{(withDue.length + noDue.length)} upcoming · {past.length} past</span>
            <span>Auto-refreshes every 5 min</span>
          </div>
        </>
      )}
    </div>
  );
}
