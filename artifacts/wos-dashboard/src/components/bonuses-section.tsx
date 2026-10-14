import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BONUS_COL_GROUPS,
  BONUS_ROWS,
  BONUS_COL_KEYS,
  getBonusValue,
  parseNum,
} from "@/lib/bonus-data";
import type { BonusCategory, BonusColDef, BonusColKey, BonusRow } from "@/lib/bonus-data";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BonusesData = Record<string, Record<string, string>>;

interface Props {
  data: BonusesData;
  onChange: (d: BonusesData) => void;
  /** Called whenever the rally cap Total Bonus changes (non-base rows only) */
  onRallyBonusTotal?: (total: number) => void;
  /** Called whenever the deployment capacity Total Bonus changes (non-base rows only) */
  onDeployBonusTotal?: (total: number) => void;
}

// ── Styling by category ───────────────────────────────────────────────────────

const ROW_CLS: Record<BonusCategory, string> = {
  base:          "bg-muted/15 text-muted-foreground/80",
  "game-system": "",
  expert:        "bg-blue-950/20",
  gear:          "bg-amber-950/20",
  other:         "",
  total:         "font-semibold bg-primary/8",
};

const SOURCE_CLS: Record<BonusCategory, string> = {
  base:          "text-muted-foreground/70 italic",
  "game-system": "text-foreground/85",
  expert:        "text-blue-400",
  gear:          "text-amber-400",
  other:         "text-foreground/85",
  total:         "text-primary font-bold",
};

const STICKY_BG: Record<BonusCategory, string> = {
  base:          "bg-muted/15",
  "game-system": "bg-card",
  expert:        "bg-blue-950/20",
  gear:          "bg-amber-950/20",
  other:         "bg-card",
  total:         "bg-primary/8",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve the display value for a cell: DB override → seed default */
function getCellVal(row: BonusRow, colKey: BonusColKey, data: BonusesData): string {
  if (row.isComputed) return getBonusValue(row, colKey);
  const stored = data[row.sourceKey]?.[colKey];
  if (stored !== undefined) return stored;
  return getBonusValue(row, colKey);
}


/** Format a summed total back to a display string */
function formatTotal(sum: number, isNumber: boolean): string {
  if (sum === 0) return "—";
  if (isNumber) {
    return Math.round(sum).toLocaleString();
  }
  return sum.toFixed(2) + "%";
}

/**
 * Compute a total for one column across the given rows.
 * Uses live data for editable rows; seed values for computed rows.
 */
function computeTotal(
  rows: BonusRow[],
  colKey: BonusColKey,
  data: BonusesData,
  isNumber: boolean,
): string {
  const sum = rows.reduce((acc, row) => acc + parseNum(getCellVal(row, colKey, data)), 0);
  return formatTotal(sum, isNumber);
}

// ── Source label ──────────────────────────────────────────────────────────────

function SourceLabel({ row }: { row: BonusRow }) {
  const isExpert = row.category === "expert";
  const name = isExpert ? row.source.replace(/^Expert /, "") : row.source;
  return (
    <span className={cn("whitespace-nowrap text-xs", SOURCE_CLS[row.category])}>
      {isExpert && (
        <span className="mr-1 text-[9px] opacity-50 font-mono uppercase">exp</span>
      )}
      {name}
      {row.isComputed && (
        <span className="ml-1.5 text-[9px] text-muted-foreground/40 font-normal not-italic">
          auto
        </span>
      )}
    </span>
  );
}

// ── Editable cell ─────────────────────────────────────────────────────────────
// Manages its own focus state so we can strip "%" while the user types and
// re-add it on blur for percentage columns.

interface EditableCellProps {
  row: BonusRow;
  col: BonusColDef;
  data: BonusesData;
  onCommit: (row: BonusRow, colKey: BonusColKey, value: string) => void;
}

function EditableCell({ row, col, data, onCommit }: EditableCellProps) {
  const committed = getCellVal(row, col.key, data);
  // `draft` is non-null only while the cell is focused
  const [draft, setDraft] = useState<string | null>(null);
  const isFocused = draft !== null;

  const handleFocus = () => {
    // Strip "%" so the user just types the number
    setDraft(!col.isNumber ? committed.replace(/%/g, "").trim() : committed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    // Auto-append "%" for percentage columns if user omitted it
    if (!col.isNumber && val && !val.endsWith("%")) {
      val = val + "%";
    }
    setDraft(null);
    onCommit(row, col.key, val);
  };

  const displayVal = isFocused ? (draft ?? "") : committed;
  const isEmpty = !committed;

  return (
    <input
      type="text"
      inputMode={col.isNumber ? "numeric" : "decimal"}
      value={displayVal}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="—"
      className={cn(
        "w-full min-w-[60px] bg-transparent text-center text-xs tabular-nums",
        "rounded px-1.5 py-0.5 transition-colors",
        "placeholder:text-muted-foreground/25",
        "hover:bg-accent/20 focus:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-primary/40",
        isEmpty ? "text-muted-foreground/30" : "text-foreground/90",
      )}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BonusesSection({ data, onChange, onRallyBonusTotal, onDeployBonusTotal }: Props) {
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const activeGroup = BONUS_COL_GROUPS[activeGroupIdx];

  // All non-total rows (used for display and for computing "Total Incl. Base")
  const dataRows = BONUS_ROWS.filter(r => r.category !== "total");
  // Non-total, non-base rows (used for "Total Bonus")
  const bonusRows = dataRows.filter(r => r.category !== "base");

  const handleCommit = (row: BonusRow, colKey: BonusColKey, value: string) => {
    if (row.isComputed) return;
    const next: BonusesData = {
      ...data,
      [row.sourceKey]: {
        ...(data[row.sourceKey] ?? {}),
        [colKey]: value,
      },
    };
    onChange(next);

    // Sync rally cap Total Bonus → troops.rallyBonus whenever a rally cap cell changes
    if (colKey === "rallyCapacity" && onRallyBonusTotal) {
      const total = bonusRows.reduce((sum, r) => {
        const val = r.isComputed
          ? getBonusValue(r, "rallyCapacity")
          : (next[r.sourceKey]?.["rallyCapacity"] ?? getBonusValue(r, "rallyCapacity"));
        return sum + parseNum(val);
      }, 0);
      onRallyBonusTotal(total);
    }

    // Sync deploy cap Total Bonus → troops.deploymentBonus whenever a deploy cap cell changes
    if (colKey === "deploymentCapacity" && onDeployBonusTotal) {
      const total = bonusRows.reduce((sum, r) => {
        const val = r.isComputed
          ? getBonusValue(r, "deploymentCapacity")
          : (next[r.sourceKey]?.["deploymentCapacity"] ?? getBonusValue(r, "deploymentCapacity"));
        return sum + parseNum(val);
      }, 0);
      onDeployBonusTotal(total);
    }
  };

  return (
    <div className="space-y-3">
      {/* Column group tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {BONUS_COL_GROUPS.map((group, i) => (
          <button
            key={group.key}
            onClick={() => setActiveGroupIdx(i)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              i === activeGroupIdx
                ? "bg-primary/20 text-primary border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border-transparent",
            )}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/30 text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap min-w-[140px] border-r border-border/30">
                Source
              </th>
              {activeGroup.cols.map(col => (
                <th
                  key={col.key}
                  className="px-2 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap min-w-[68px]"
                >
                  <div className="text-[10px] leading-tight">{col.short}</div>
                  <div className="text-[9px] text-muted-foreground/40 font-normal">
                    {col.isNumber ? "#" : "%"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Data rows */}
            {dataRows.map((row, i) => (
              <tr
                key={row.source}
                className={cn(
                  "border-b border-border/25 transition-colors group",
                  ROW_CLS[row.category],
                  row.category === "game-system" && i % 2 === 0
                    ? "bg-background/20"
                    : "",
                )}
              >
                {/* Sticky source cell */}
                <td
                  className={cn(
                    "sticky left-0 z-10 px-3 py-1.5 border-r border-border/30 whitespace-nowrap",
                    STICKY_BG[row.category],
                  )}
                >
                  <SourceLabel row={row} />
                </td>

                {/* Value cells */}
                {activeGroup.cols.map(col => {
                  if (row.isComputed) {
                    const val = getCellVal(row, col.key, data);
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "px-2 py-1.5 text-center tabular-nums",
                          !val ? "text-muted-foreground/30" : "text-foreground/80",
                        )}
                      >
                        {val || "—"}
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className="px-1 py-1">
                      <EditableCell
                        row={row}
                        col={col}
                        data={data}
                        onCommit={handleCommit}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Divider before totals */}
            <tr>
              <td
                colSpan={1 + activeGroup.cols.length}
                className="h-px bg-border/60 p-0"
              />
            </tr>

            {/* Total rows — computed live from current data */}
            {[
              { label: "Total Bonus",      rows: bonusRows },
              { label: "Total Incl. Base", rows: dataRows  },
            ].map(({ label, rows: sumRows }) => (
              <tr
                key={label}
                className={cn("border-b border-border/25", ROW_CLS["total"])}
              >
                <td
                  className={cn(
                    "sticky left-0 z-10 px-3 py-2 border-r border-border/30 whitespace-nowrap",
                    STICKY_BG["total"],
                  )}
                >
                  <span className={cn("whitespace-nowrap text-xs", SOURCE_CLS["total"])}>
                    {label}
                  </span>
                </td>
                {activeGroup.cols.map(col => (
                  <td
                    key={col.key}
                    className="px-2 py-2 text-center tabular-nums text-primary"
                  >
                    {computeTotal(sumRows, col.key, data, col.isNumber)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[10px] text-muted-foreground/50">
        <span>
          <span className="inline-block w-2 h-2 rounded-sm bg-blue-500/25 mr-1 align-middle" />
          Expert bonuses (editable)
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-500/25 mr-1 align-middle" />
          Gear / Charms / Pets (editable)
        </span>
        <span className="italic">Values can be overridden directly in the table</span>
      </div>
    </div>
  );
}
