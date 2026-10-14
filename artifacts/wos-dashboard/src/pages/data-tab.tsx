import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTroops,
  useUpdateTroops,
  getGetTroopsQueryKey,
  useGetDashboardSummary,
  getGetTroopsSummaryQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetMarchesRemainingQueryKey,
} from "@workspace/api-client-react";
import { BONUS_ROWS, getBonusValue, parseNum } from "@/lib/bonus-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEdit } from "@/components/inline-edit";
import { StatCard } from "@/components/stat-card";
import { Shield, Target, Users, Swords, Crosshair, Lock, CalendarDays } from "lucide-react";
import { evalMathExpr } from "@/lib/math-expr";
import { useToast } from "@/hooks/use-toast";

const CYRILLE_BONUS = 30_000;
const HERO_TROOPS_CAPACITY = 13_470;
const HERO_MULTIPLIER = 3;

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ── Rally bonus reverse-sync: Roster → Bonuses table ────────────────────────
// When the user edits deploymentBonus in the Roster, adjust the "Other" row in
// profile bonuses so the Bonuses table Deploy # Total Bonus stays consistent.
async function syncDeployBonusToBonuses(
  newDeployBonus: number,
  currentBonuses: Record<string, Record<string, string>>,
) {
  const sumWithoutOther = BONUS_ROWS
    .filter(r => r.category !== "base" && r.category !== "total" && r.sourceKey !== "other")
    .reduce((acc, r) => {
      const val = r.isComputed
        ? getBonusValue(r, "deploymentCapacity")
        : (currentBonuses[r.sourceKey]?.["deploymentCapacity"] ?? getBonusValue(r, "deploymentCapacity"));
      return acc + parseNum(val);
    }, 0);

  const newOtherVal = Math.max(0, newDeployBonus - sumWithoutOther);
  const updatedBonuses = {
    ...currentBonuses,
    other: { ...(currentBonuses["other"] ?? {}), deploymentCapacity: String(newOtherVal) },
  };

  await fetch(`${BASE}/api/profile/bonuses`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedBonuses),
  });
}

// When the user edits rallyBonus in the Roster, adjust the "Other" row in
// profile bonuses so the Bonuses table Total Bonus stays consistent.
async function syncRallyBonusToBonuses(
  newRallyBonus: number,
  currentBonuses: Record<string, Record<string, string>>,
) {
  // Sum all non-base, non-total, non-"other" rows (editable + computed) for rallyCapacity
  const sumWithoutOther = BONUS_ROWS
    .filter(r => r.category !== "base" && r.category !== "total" && r.sourceKey !== "other")
    .reduce((acc, r) => {
      const val = r.isComputed
        ? getBonusValue(r, "rallyCapacity")
        : (currentBonuses[r.sourceKey]?.["rallyCapacity"] ?? getBonusValue(r, "rallyCapacity"));
      return acc + parseNum(val);
    }, 0);

  const newOtherVal = Math.max(0, newRallyBonus - sumWithoutOther);
  const updatedBonuses = {
    ...currentBonuses,
    other: { ...(currentBonuses["other"] ?? {}), rallyCapacity: String(newOtherVal) },
  };

  await fetch(`${BASE}/api/profile/bonuses`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedBonuses),
  });
}

const SERVER_CREATION_DATE = new Date("2025-12-12T00:00:00");

function getServerAgeDays(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const created = new Date(SERVER_CREATION_DATE);
  created.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function DataTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: troops, isLoading: loadingTroops } = useGetTroops();
  const { data: dashboard, isLoading: loadingDashboard } = useGetDashboardSummary();
  const updateTroops = useUpdateTroops();

  const heliosInfantry = troops?.heliosInfantry ?? 0;
  const heliosLancer = troops?.heliosLancer ?? 0;
  const heliosMarksman = troops?.heliosMarksman ?? 0;
  const total = heliosInfantry + heliosLancer + heliosMarksman;
  const heliosInfantryPct = total > 0 ? (heliosInfantry / total) * 100 : 0;
  const heliosLancerPct = total > 0 ? (heliosLancer / total) * 100 : 0;
  const heliosMarksmanPct = total > 0 ? (heliosMarksman / total) * 100 : 0;

  // Computed capacity values
  const deployCapNoHeroes = (troops?.deploymentCapacity ?? 0) + (troops?.deploymentBonus ?? 0);
  const heroCapContrib = HERO_TROOPS_CAPACITY * HERO_MULTIPLIER; // 40,410
  const totalDeploymentCap = deployCapNoHeroes + heroCapContrib;
  const totalRallyCap = (troops?.rallyCapacity ?? 0) + (troops?.rallyBonus ?? 0) + deployCapNoHeroes;

  const handleUpdate = (field: string, value: string) => {
    const numValue = evalMathExpr(value.replace(/,/g, ""));
    if (numValue === null || numValue < 0) {
      toast({ title: "Invalid number", variant: "destructive" });
      return;
    }

    // Always send the full troops object with the changed field swapped in.
    // cyrilleBonus is always fixed at CYRILLE_BONUS — never sent from user input.
    const fullPayload = {
      infantry: troops?.infantry ?? 0,
      lancer: troops?.lancer ?? 0,
      marksman: troops?.marksman ?? 0,
      heliosInfantry: troops?.heliosInfantry ?? 0,
      heliosLancer: troops?.heliosLancer ?? 0,
      heliosMarksman: troops?.heliosMarksman ?? 0,
      deploymentCapacity: troops?.deploymentCapacity ?? 0,
      deploymentBonus: troops?.deploymentBonus ?? 0,
      cyrilleBonus: CYRILLE_BONUS,
      rallyCapacity: troops?.rallyCapacity ?? 0,
      rallyBonus: troops?.rallyBonus ?? 0,
      [field]: numValue,
    };

    updateTroops.mutate(
      { data: fullPayload },
      {
        onSuccess: (newTroops) => {
          queryClient.setQueryData(getGetTroopsQueryKey(), newTroops);
          queryClient.invalidateQueries({ queryKey: getGetTroopsSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMarchesRemainingQueryKey() });
          toast({ title: "Saved" });

          // Sync rally bonus change back to Bonuses table "Other" row
          if (field === "rallyBonus") {
            const cachedProfile = queryClient.getQueryData<{ bonuses?: Record<string, Record<string, string>> }>(["profile"]);
            const currentBonuses = (cachedProfile?.bonuses ?? {}) as Record<string, Record<string, string>>;
            syncRallyBonusToBonuses(numValue, currentBonuses).then(() => {
              queryClient.invalidateQueries({ queryKey: ["profile"] });
            });
          }
          // Sync deploy bonus change back to Bonuses table "Other" row
          if (field === "deploymentBonus") {
            const cachedProfile = queryClient.getQueryData<{ bonuses?: Record<string, Record<string, string>> }>(["profile"]);
            const currentBonuses = (cachedProfile?.bonuses ?? {}) as Record<string, Record<string, string>>;
            syncDeployBonusToBonuses(numValue, currentBonuses).then(() => {
              queryClient.invalidateQueries({ queryKey: ["profile"] });
            });
          }
        },
        onError: () => {
          toast({ title: "Failed to save", variant: "destructive" });
        },
      }
    );
  };

  if (loadingTroops || loadingDashboard) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full bg-card/50" />
          ))}
        </div>
        <Skeleton className="h-96 w-full bg-card/50" />
      </div>
    );
  }

  if (!troops) return null;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Troops"
          value={total.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          className="border-t-2 border-t-primary/50"
        />

        <StatCard
          title="Total Deployment Capacity"
          value={totalDeploymentCap.toLocaleString()}
          icon={<Shield className="w-5 h-5 text-primary" />}
          className="border-t-2 border-t-primary/50 bg-primary/5"
        />
        <StatCard
          title="Total Rally Capacity"
          value={totalRallyCap.toLocaleString()}
          icon={<Swords className="w-5 h-5 text-red-400" />}
          className="border-t-2 border-t-red-500/50 bg-red-500/5"
        />
      </div>

      {/* Server Age */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-card/40 border border-border/50 w-fit">
        <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Server Created</span>
            <span className="font-mono font-semibold">
              {SERVER_CREATION_DATE.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
            </span>
          </div>
          <div className="w-px h-4 bg-border/60" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Server Age</span>
            <span className="font-mono font-bold text-primary">{getServerAgeDays().toLocaleString()}</span>
            <span className="text-muted-foreground text-xs">days</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Troop Roster — editable */}
        <Card className="lg:col-span-2 bg-card/40 backdrop-blur border-border/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Troop Roster
              <span className="ml-auto text-xs text-muted-foreground font-normal">Click the pencil icon to edit</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[calc(100%-57px)]">
            <div className="divide-y divide-border/50 flex flex-col flex-1">

              {/* ── Helios Tier (T11) header ── */}
              <div className="px-4 py-1.5 bg-red-950/30 border-y border-red-900/20">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">Helios Tier · T11</span>
              </div>

              {/* Helios Infantry */}
              <div className="p-4 flex flex-1 items-center justify-between bg-red-950/10 hover:bg-red-950/20 transition-colors border-l-2 border-l-red-600/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-10 rounded-full bg-infantry ring-1 ring-red-500/50 flex-shrink-0" />
                  <div>
                    <div className="font-semibold tracking-wide text-sm">HELIOS INFANTRY</div>
                    <div className="text-[10px] text-red-400/70 font-medium">T11</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{heliosInfantryPct.toFixed(1)}% of total</div>
                    <div className="mt-1 w-24 h-1 bg-red-900/30 rounded-full overflow-hidden">
                      <div className="h-full bg-infantry rounded-full transition-all duration-500" style={{ width: `${heliosInfantryPct}%` }} />
                    </div>
                  </div>
                </div>
                <InlineEdit type="number" value={heliosInfantry} onSave={(v) => handleUpdate("heliosInfantry", v)} className="text-2xl font-bold text-infantry" />
              </div>

              {/* Helios Lancer */}
              <div className="p-4 flex flex-1 items-center justify-between bg-red-950/10 hover:bg-red-950/20 transition-colors border-l-2 border-l-red-600/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-10 rounded-full bg-lancer ring-1 ring-red-500/50 flex-shrink-0" />
                  <div>
                    <div className="font-semibold tracking-wide text-sm">HELIOS LANCER</div>
                    <div className="text-[10px] text-red-400/70 font-medium">T11</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{heliosLancerPct.toFixed(1)}% of total</div>
                    <div className="mt-1 w-24 h-1 bg-red-900/30 rounded-full overflow-hidden">
                      <div className="h-full bg-lancer rounded-full transition-all duration-500" style={{ width: `${heliosLancerPct}%` }} />
                    </div>
                  </div>
                </div>
                <InlineEdit type="number" value={heliosLancer} onSave={(v) => handleUpdate("heliosLancer", v)} className="text-2xl font-bold text-lancer" />
              </div>

              {/* Helios Marksman */}
              <div className="p-4 flex flex-1 items-center justify-between bg-red-950/10 hover:bg-red-950/20 transition-colors border-l-2 border-l-red-600/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-10 rounded-full bg-marksman ring-1 ring-red-500/50 flex-shrink-0" />
                  <div>
                    <div className="font-semibold tracking-wide text-sm">HELIOS MARKSMAN</div>
                    <div className="text-[10px] text-red-400/70 font-medium">T11</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{heliosMarksmanPct.toFixed(1)}% of total</div>
                    <div className="mt-1 w-24 h-1 bg-red-900/30 rounded-full overflow-hidden">
                      <div className="h-full bg-marksman rounded-full transition-all duration-500" style={{ width: `${heliosMarksmanPct}%` }} />
                    </div>
                  </div>
                </div>
                <InlineEdit type="number" value={heliosMarksman} onSave={(v) => handleUpdate("heliosMarksman", v)} className="text-2xl font-bold text-marksman" />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Capacity Parameters */}
        <Card className="bg-card/40 backdrop-blur border-border/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-primary" />
              Capacity Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">

            {/* ── Deployment section ── */}
            <div className="px-4 pt-3 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                Deployment Capacity
              </div>
            </div>

            {/* Row 1: two editable fields */}
            <div className="grid grid-cols-2 divide-x divide-border/50 border-y border-border/50">
              <div className="p-3">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Base</div>
                <InlineEdit
                  type="number"
                  value={troops.deploymentCapacity}
                  onSave={(v) => handleUpdate("deploymentCapacity", v)}
                  className="text-base font-bold"
                />
              </div>
              <div className="p-3">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Bonuses</div>
                <InlineEdit
                  type="number"
                  value={troops.deploymentBonus}
                  onSave={(v) => handleUpdate("deploymentBonus", v)}
                  className="text-base font-bold"
                />
              </div>
            </div>

            {/* Row 2: total w/o heroes */}
            <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Total (w/o heroes)</div>
              <span className="text-sm font-bold font-mono">{deployCapNoHeroes.toLocaleString()}</span>
            </div>

            {/* Row 3: hero troops fixed */}
            <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Hero Troops Capacity</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-mono text-muted-foreground/70">{HERO_TROOPS_CAPACITY.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground/40">×{HERO_MULTIPLIER}</span>
                  <span className="text-[10px] text-muted-foreground/40">=</span>
                  <span className="text-xs font-mono font-semibold text-muted-foreground/70">{heroCapContrib.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/40">
                <Lock className="w-3 h-3" />
                <span className="text-[10px]">fixed</span>
              </div>
            </div>

            {/* Row 4: Total Deployment Capacity — highlighted */}
            <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20">
              <div className="text-[10px] font-semibold text-primary/70 mb-0.5 uppercase tracking-wider">Total Deployment Capacity</div>
              <span className="text-xl font-bold font-mono text-primary">{totalDeploymentCap.toLocaleString()}</span>
            </div>

            {/* ── Rally section ── */}
            <div className="px-4 pt-3 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-400/60">
                Rally Capacity
              </div>
            </div>

            {/* Row 1: two editable fields */}
            <div className="grid grid-cols-2 divide-x divide-border/50 border-y border-border/50">
              <div className="p-3">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Base</div>
                <InlineEdit
                  type="number"
                  value={troops.rallyCapacity}
                  onSave={(v) => handleUpdate("rallyCapacity", v)}
                  className="text-base font-bold text-red-400"
                />
              </div>
              <div className="p-3">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Bonuses</div>
                <InlineEdit
                  type="number"
                  value={troops.rallyBonus}
                  onSave={(v) => handleUpdate("rallyBonus", v)}
                  className="text-base font-bold text-red-400"
                />
              </div>
            </div>

            {/* Row 2: total w/o deploy cap */}
            <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Total (w/o Deploy Cap)</div>
              <span className="text-sm font-bold font-mono">
                {(troops.rallyCapacity + troops.rallyBonus).toLocaleString()}
              </span>
            </div>

            {/* Row 3: Deployment Capacity (locked reference) */}
            <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Deploy Cap (w/o heroes)</div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold font-mono">{deployCapNoHeroes.toLocaleString()}</span>
                <Lock className="w-3 h-3 text-muted-foreground/40" />
              </div>
            </div>

            {/* Row 4: Total Rally Capacity — highlighted */}
            <div className="px-4 py-2.5 bg-red-500/5 border-t border-red-500/20 rounded-b-lg">
              <div className="text-[10px] font-semibold text-red-400/70 mb-0.5 uppercase tracking-wider">Total Rally Capacity</div>
              <span className="text-xl font-bold font-mono text-red-400">{totalRallyCap.toLocaleString()}</span>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
