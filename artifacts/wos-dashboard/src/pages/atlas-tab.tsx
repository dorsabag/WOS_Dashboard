import { useState, useEffect } from "react";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe2, Trophy, X, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Formatting helpers ───────────────────────────────────────────────────────

/** Strip trailing zeros from a fixed-decimal string ("6.00" → "6", "18.60" → "18.6"). */
function stripTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

/** Format raw power like wosatlas: 18684123456 → "18.68B". */
export function formatPower(power: number): string {
  if (power >= 1e9) return `${stripTrailingZeros((power / 1e9).toFixed(2))}B`;
  if (power >= 1e6) return `${stripTrailingZeros((power / 1e6).toFixed(2))}M`;
  return power.toLocaleString("en-US");
}

/** Format the jump delta (already a percentage) or return the em-dash placeholder. */
export function formatDelta(deltaPercent: number | null): string {
  if (deltaPercent === null) return "—";
  const s = stripTrailingZeros(deltaPercent.toFixed(2));
  return deltaPercent > 0 ? `+${s}%` : `${s}%`;
}

// ── Relative-time hook ───────────────────────────────────────────────────────

/** Returns a human-readable "X ago" string for the given ISO timestamp, updated every 15 s. */
function useTimeAgo(fetchedAt: string | undefined): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!fetchedAt) {
      setLabel("");
      return;
    }

    const compute = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 1000));
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      return `${Math.floor(diffMin / 60)}h ago`;
    };

    setLabel(compute());
    const id = setInterval(() => setLabel(compute()), 15_000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  return label;
}

const STATE_ID_RE = /^[1-9]\d*$/;

const RANK_COLORS: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-slate-300",
  3: "text-amber-600",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AtlasTab() {
  const [stateFilter, setStateFilter] = useState<number | null>(null);
  const [stateInput, setStateInput] = useState("");
  const [inputError, setInputError] = useState(false);

  const query = useGetLeaderboard(
    stateFilter !== null ? { stateId: stateFilter } : undefined,
  );

  const timeAgo = useTimeAgo(query.data?.fetchedAt);

  const commitStateInput = () => {
    const trimmed = stateInput.trim();
    if (trimmed === "") return;
    if (!STATE_ID_RE.test(trimmed) || !Number.isSafeInteger(Number(trimmed))) {
      setInputError(true);
      return;
    }
    setStateFilter(Number(trimmed));
    setStateInput("");
    setInputError(false);
  };

  const rows = query.data?.rows ?? [];
  const maxPower = rows.reduce((max, r) => Math.max(max, r.power), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-wide">Power Leaderboard</h2>
          <p className="text-xs text-muted-foreground">
            Live top 100 from WoS Atlas (unofficial API)
          </p>
        </div>
      </div>

      {/* Filter card */}
      <Card className="bg-card/60 border-border/80">
        <CardContent className="pt-6 flex flex-wrap items-center gap-3">
          <Globe2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Filter:</span>
          {stateFilter !== null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/40 text-primary px-3 py-1 text-sm font-medium">
              State {stateFilter}
              <button
                type="button"
                aria-label={`Remove State ${stateFilter}`}
                className="rounded-full hover:bg-primary/25 p-0.5 transition-colors"
                onClick={() => setStateFilter(null)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ) : (
            <span className="text-sm font-medium">Global</span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex flex-col">
              <Input
                value={stateInput}
                inputMode="numeric"
                placeholder="State # + Enter"
                aria-label="Filter by state"
                aria-invalid={inputError}
                className={cn(
                  "h-9 w-40 bg-background/60",
                  inputError && "border-destructive focus-visible:ring-destructive",
                )}
                onChange={(e) => {
                  setStateInput(e.target.value);
                  if (inputError) setInputError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitStateInput();
                  }
                }}
              />
              {inputError && (
                <span className="text-xs text-destructive mt-1">
                  Enter a positive whole number
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard card */}
      <Card className="bg-card/60 border-border/80">
        <CardHeader className="pb-3 space-y-0">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              {stateFilter !== null ? `State ${stateFilter} — Top 100` : "Global — Top 100"}
            </CardTitle>
            {query.data && timeAgo && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Updated {timeAgo}
              </span>
            )}
          </div>
          {query.data?.isStale && (
            <p className="mt-1.5 text-xs text-amber-400/90 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Showing a cached snapshot — upstream is temporarily rate-limited
            </p>
          )}
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          {query.isPending ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : query.isError ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {(query.error?.data as { message?: string } | null)?.message ??
                  "Failed to load the leaderboard."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => query.refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No ranked players.
            </div>
          ) : (
            <ol className="divide-y divide-border/60">
              {rows.map((row) => {
                const barPct = maxPower > 0 ? (row.power / maxPower) * 100 : 0;
                const delta = formatDelta(row.deltaPercent);
                return (
                  <li
                    key={row.playerId}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:grid-cols-[3rem_minmax(0,14rem)_minmax(0,1fr)_5.5rem_4.5rem] items-center gap-x-3 py-2.5 px-1 sm:px-2 hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className={cn(
                        "font-mono text-sm font-bold tabular-nums",
                        RANK_COLORS[row.rank] ?? "text-muted-foreground",
                      )}
                    >
                      #{row.rank}
                    </span>

                    <div className="min-w-0">
                      <div className="text-sm font-medium text-primary truncate">
                        {row.playerName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.stateId !== null ? `State ${row.stateId}` : "State —"}
                      </div>
                    </div>

                    {/* Power bar + value (bar hidden on mobile) */}
                    <div className="hidden sm:flex items-center gap-3 min-w-0">
                      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums w-20 text-right shrink-0">
                        {formatPower(row.power)}
                      </span>
                    </div>

                    <span className="hidden sm:block text-xs text-muted-foreground text-right">
                      Furnace {row.furnaceLevel}
                    </span>

                    <span
                      className={cn(
                        "text-xs font-mono tabular-nums text-right",
                        row.deltaPercent === null
                          ? "text-muted-foreground"
                          : row.deltaPercent >= 0
                            ? "text-emerald-400"
                            : "text-red-400",
                      )}
                    >
                      Δ {delta}
                    </span>

                    {/* Mobile: power + furnace under the delta column */}
                    <span className="sm:hidden col-start-3 row-start-1 text-right">
                      <span className="block font-mono text-sm font-semibold tabular-nums">
                        {formatPower(row.power)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        F{row.furnaceLevel} · Δ {delta}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
