import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetMarches,
  useUpdateMarch,
  useGetMarchesRemaining,
  useGetTroopsSummary,
  getGetMarchesQueryKey,
  getGetMarchesRemainingQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEdit } from "@/components/inline-edit";
import { useToast } from "@/hooks/use-toast";
import { Flame, ShieldAlert, Crosshair, Swords, Pencil, Check, X, Lock } from "lucide-react";
import { evalMathExpr } from "@/lib/math-expr";
import { MarchIconSlot, resolveIconUrl } from "@/components/march-icon-slot";
import { IconPickerModal } from "@/components/icon-picker-modal";
import { useUpload } from "@/hooks/use-upload";
import { CapacitySummary } from "@/components/capacity-summary";

function PercentCell({
  amount,
  totalCap,
  onSave,
  className = "",
}: {
  amount: number;
  totalCap: number;
  onSave: (computedAmount: string) => void;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const pct = totalCap > 0 ? (amount / totalCap) * 100 : 0;
  const [draft, setDraft] = useState(pct.toFixed(1));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft((totalCap > 0 ? (amount / totalCap) * 100 : 0).toFixed(1));
  }, [amount, totalCap, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    const p = parseFloat(draft);
    if (!isNaN(p)) {
      const computed = Math.floor((p / 100) * totalCap);
      onSave(computed.toString());
    }
  };

  const cancel = () => {
    setIsEditing(false);
    setDraft((totalCap > 0 ? (amount / totalCap) * 100 : 0).toFixed(1));
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className={`font-mono font-semibold text-sm ${className}`}>
        {amount.toLocaleString()}
      </span>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <div className="relative">
            <Input
              ref={inputRef}
              type="number"
              step="0.1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
              className="h-6 w-20 px-2 pr-5 py-0 text-xs font-mono bg-background/80 border-primary/70 focus-visible:ring-1 focus-visible:ring-primary text-right"
            />
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
          </div>
          <button onMouseDown={(e) => { e.preventDefault(); commit(); }} className="p-0.5 rounded text-green-400 hover:bg-green-400/10 transition-colors" type="button">
            <Check className="w-3 h-3" />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); cancel(); }} className="p-0.5 rounded text-muted-foreground hover:bg-muted/50 transition-colors" type="button">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground/60 hover:text-primary transition-colors group/pct"
          type="button"
        >
          <span>{pct.toFixed(1)}%</span>
          <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/pct:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}

// Combined cell: click the number to edit raw value, click % badge to edit by percentage
function DualEditCell({
  amount,
  totalCap,
  onSave,
  className = "",
}: {
  amount: number;
  totalCap: number;
  onSave: (value: string) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<"view" | "number" | "percent">("view");
  const pct = totalCap > 0 ? (amount / totalCap) * 100 : 0;
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "view") return;
    if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [mode]);

  const openNumber = () => { setDraft(amount.toString()); setMode("number"); };
  const openPercent = () => { setDraft(pct.toFixed(1)); setMode("percent"); };

  const commit = () => {
    if (mode === "number") {
      const r = evalMathExpr(draft.replace(/,/g, ""));
      if (r !== null) onSave(r.toString());
    } else if (mode === "percent") {
      const p = parseFloat(draft);
      if (!isNaN(p)) onSave(Math.floor((p / 100) * totalCap).toString());
    }
    setMode("view");
  };

  const cancel = () => setMode("view");

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancel();
  };

  if (mode === "number") {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className="h-6 w-24 px-2 py-0 text-xs font-mono bg-background/80 border-primary/70 focus-visible:ring-1 focus-visible:ring-primary text-right"
        />
        <button onMouseDown={(e) => { e.preventDefault(); commit(); }} className="p-0.5 rounded text-green-400 hover:bg-green-400/10 transition-colors" type="button"><Check className="w-3 h-3" /></button>
        <button onMouseDown={(e) => { e.preventDefault(); cancel(); }} className="p-0.5 rounded text-muted-foreground hover:bg-muted/50 transition-colors" type="button"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  if (mode === "percent") {
    return (
      <div className="flex items-center gap-1">
        <div className="relative">
          <Input
            ref={inputRef}
            type="number"
            step="0.1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            className="h-6 w-20 px-2 pr-5 py-0 text-xs font-mono bg-background/80 border-primary/70 focus-visible:ring-1 focus-visible:ring-primary text-right"
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); commit(); }} className="p-0.5 rounded text-green-400 hover:bg-green-400/10 transition-colors" type="button"><Check className="w-3 h-3" /></button>
        <button onMouseDown={(e) => { e.preventDefault(); cancel(); }} className="p-0.5 rounded text-muted-foreground hover:bg-muted/50 transition-colors" type="button"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={openNumber}
        className={`font-mono font-semibold text-sm hover:underline underline-offset-2 cursor-pointer ${className}`}
        type="button"
      >
        {amount.toLocaleString()}
      </button>
      <button
        onClick={openPercent}
        className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground/60 hover:text-primary transition-colors group/pct"
        type="button"
      >
        <span>{pct.toFixed(1)}%</span>
        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/pct:opacity-100 transition-opacity" />
      </button>
    </div>
  );
}

const HERO_LABELS_KEY = "wos-hero-labels";

function loadHeroLabels(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(HERO_LABELS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function BearTrapTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: marches, isLoading: loadingMarches } = useGetMarches();
  const { data: remaining, isLoading: loadingRemaining } = useGetMarchesRemaining();
  const { data: troopsSummary } = useGetTroopsSummary();
  const updateMarch = useUpdateMarch();

  const [heroLabels, setHeroLabels] = useState<Record<string, string>>(loadHeroLabels);
  const [iconPicker, setIconPicker] = useState<{ marchId: number; slot: 0 | 1 | 2 } | null>(null);
  const [iconSavePending, setIconSavePending] = useState(false);
  const { uploadFile, isUploading } = useUpload();
  const isPendingIcon = isUploading || iconSavePending;

  // Derived capacity values from summary (now includes deployCapNoHeroes, totalDeploymentCap, etc.)
  const deployCapNoHeroes = troopsSummary?.deployCapNoHeroes ?? 0;
  const totalDeploymentCap = troopsSummary?.totalDeploymentCap ?? 0;
  const totalRallyCap = troopsSummary?.totalRallyCap ?? 0;
  // Rally march (march #1) percent cells calculate against full BT deploy cap:
  // totalDeploymentCap (base + bonuses + 3 heroes) + Cyrille bonus
  const CYRILLE_BONUS = 30_000;
  const totalCapWithCyrille = totalDeploymentCap + CYRILLE_BONUS;

  const handleHeroLabel = (marchId: number, slot: number, value: string) => {
    const key = `${marchId}-${slot}`;
    setHeroLabels((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(HERO_LABELS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleUpdate = (id: number, field: string, value: string | null) => {
    let fieldValue: number | string | null = value;
    if (field !== 'label' && field !== 'notes' && !field.startsWith('icon') && value !== null) {
      const result = evalMathExpr((value as string).replace(/,/g, ""));
      if (result === null) {
        toast({ title: "Invalid number", variant: "destructive" });
        return;
      }
      fieldValue = result;
    }

    updateMarch.mutate({
      id,
      data: { [field]: fieldValue }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMarchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMarchesRemainingQueryKey() });
      },
      onError: () => {
        toast({ title: "Error saving data", variant: "destructive" });
      }
    });
  };

  const handleSaveMarchIcon = (marchId: number, slot: 0 | 1 | 2, value: string | null) => {
    setIconSavePending(true);
    updateMarch.mutate({ id: marchId, data: { [`icon${slot}`]: value } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMarchesQueryKey() });
        setIconSavePending(false);
        setIconPicker(null);
        toast({ title: value === null ? "Icon removed" : "Icon saved" });
      },
      onError: () => {
        setIconSavePending(false);
        toast({ title: value === null ? "Failed to remove icon" : "Failed to save icon", variant: "destructive" });
      },
    });
  };

  const handleUploadMarchIcon = async (file: File) => {
    if (!iconPicker) return;
    const resp = await uploadFile(file);
    if (resp) {
      handleSaveMarchIcon(iconPicker.marchId, iconPicker.slot, resp.objectPath);
    } else {
      toast({ title: "Failed to upload icon", variant: "destructive" });
    }
  };

  const currentIconValue = iconPicker && marches
    ? (marches.find(m => m.id === iconPicker.marchId) as Record<string, string | null | undefined> | undefined)?.[`icon${iconPicker.slot}`] ?? null
    : null;

  if (loadingMarches || loadingRemaining) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <Skeleton className="h-[600px] w-full bg-card/50" />
      </div>
    );
  }

  if (!marches || !remaining) return null;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Capacity summary — synced from Roster tab */}
      <CapacitySummary
        deployCapNoHeroes={deployCapNoHeroes}
        totalDeploymentCap={totalDeploymentCap}
        totalRallyCap={totalRallyCap}
      />

      <Card className="bg-card/40 backdrop-blur border-border/50 border-t-4 border-t-red-500/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            Bear Trap Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase border-y border-border/50">
              <tr>
                <th className="px-4 py-3 font-semibold w-10 text-center">#</th>
                <th className="px-4 py-3 font-semibold w-44">Label</th>
                <th className="px-4 py-3 font-semibold text-infantry w-32"><div className="flex justify-end">Infantry</div></th>
                <th className="px-4 py-3 font-semibold text-lancer w-32"><div className="flex justify-end">Lancer</div></th>
                <th className="px-4 py-3 font-semibold text-marksman w-32"><div className="flex justify-end">Marksman</div></th>
                <th className="px-4 py-3 font-semibold w-32"><div className="flex justify-end">Capacity</div></th>
                <th className="px-4 py-3 font-semibold text-muted-foreground w-28"><div className="flex justify-end">Total</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {marches.map((m) => {
                const total = m.infantry + m.lancer + m.marksman;
                const isOwnRally = m.marchNumber === 1;
                const isFinalJoiner = m.marchNumber === 7;
                const hasHeroes = !!(m.icon0 || m.icon1 || m.icon2);
                const deployCapWithCyrille = deployCapNoHeroes + CYRILLE_BONUS;
                const usesHeroCapacity = isOwnRally || isFinalJoiner || hasHeroes;
                const effectiveCap = usesHeroCapacity ? totalCapWithCyrille : deployCapWithCyrille;
                const isOverCap = effectiveCap > 0 && total > effectiveCap;
                return (
                  <tr key={m.id}>
                    <td colSpan={7} className="p-0">
                      <table className="w-full">
                        <tbody>
                          <tr className={`hover:bg-muted/10 transition-colors group ${isOwnRally ? 'bg-primary/5' : ''}`}>
                            <td className="px-4 py-3 text-center font-mono font-bold text-muted-foreground w-10">{m.marchNumber}</td>
                            <td className="px-4 py-3 font-semibold w-44">
                              <div className="flex items-center gap-2">
                                <InlineEdit value={m.label} onSave={(v) => handleUpdate(m.id, 'label', v)} />
                                {isOwnRally && <span className="text-[10px] font-semibold text-primary/60 uppercase tracking-wider border border-primary/30 rounded px-1">%</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 w-32">
                              <div className="flex justify-end">
                                {isOwnRally
                                  ? <PercentCell amount={m.infantry} totalCap={totalCapWithCyrille} onSave={(v) => handleUpdate(m.id, 'infantry', v)} className="text-infantry" />
                                  : <DualEditCell amount={m.infantry} totalCap={effectiveCap} onSave={(v) => handleUpdate(m.id, 'infantry', v)} className="text-infantry" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 w-32">
                              <div className="flex justify-end">
                                {isOwnRally
                                  ? <PercentCell amount={m.lancer} totalCap={totalCapWithCyrille} onSave={(v) => handleUpdate(m.id, 'lancer', v)} className="text-lancer" />
                                  : <DualEditCell amount={m.lancer} totalCap={effectiveCap} onSave={(v) => handleUpdate(m.id, 'lancer', v)} className="text-lancer" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 w-32">
                              <div className="flex justify-end">
                                {isOwnRally
                                  ? <PercentCell amount={m.marksman} totalCap={totalCapWithCyrille} onSave={(v) => handleUpdate(m.id, 'marksman', v)} className="text-marksman font-bold" />
                                  : <DualEditCell amount={m.marksman} totalCap={effectiveCap} onSave={(v) => handleUpdate(m.id, 'marksman', v)} className="text-marksman font-bold" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 w-32">
                              <div className="flex justify-end">
                                <div className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground/80">
                                  <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                                  {effectiveCap.toLocaleString()}
                                </div>
                              </div>
                            </td>
                            <td className={`px-4 py-3 font-mono font-bold text-right w-28 ${isOverCap ? 'text-destructive' : 'text-primary'}`}>
                              {total.toLocaleString()}
                            </td>
                          </tr>
                          <tr className={`${isOwnRally ? 'bg-primary/5' : 'bg-muted/5'}`}>
                            <td colSpan={7} className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 w-10 text-right flex-shrink-0">Heroes</span>
                                <div className="flex gap-3">
                                  {([0, 1, 2] as const).map(slot => {
                                    const iconField = `icon${slot}` as "icon0" | "icon1" | "icon2";
                                    return (
                                      <MarchIconSlot
                                        key={slot}
                                        iconValue={m[iconField]}
                                        onOpenPicker={() => setIconPicker({ marchId: m.id, slot })}
                                        onRemove={() => handleSaveMarchIcon(m.id, slot, null)}
                                        label={heroLabels[`${m.id}-${slot}`] ?? ""}
                                        onLabelChange={(v) => handleHeroLabel(m.id, slot, v)}
                                        isPending={isPendingIcon && iconPicker?.marchId === m.id && iconPicker?.slot === slot}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Remaining calculations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-infantry" /> Infantry Left
              </div>
              <div className={`text-2xl font-bold font-mono ${remaining.infantryRemaining < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {remaining.infantryRemaining.toLocaleString()}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Used: {remaining.infantryUsed.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                <Swords className="w-4 h-4 text-lancer" /> Lancer Left
              </div>
              <div className={`text-2xl font-bold font-mono ${remaining.lancerRemaining < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {remaining.lancerRemaining.toLocaleString()}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Used: {remaining.lancerUsed.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-card/40 border-border/50 ${remaining.marksmanRemaining < 0 ? 'border-destructive/50 bg-destructive/5' : 'border-marksman/30 bg-marksman/5'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-marksman mb-1 flex items-center gap-2 uppercase tracking-wider">
                <Crosshair className="w-4 h-4" /> Marksman Left
              </div>
              <div className={`text-2xl font-bold font-mono ${remaining.marksmanRemaining < 0 ? 'text-destructive' : 'text-marksman'}`}>
                {remaining.marksmanRemaining.toLocaleString()}
              </div>
            </div>
            <div className="text-right text-xs text-marksman/70">
              Used: {remaining.marksmanUsed.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <IconPickerModal
        open={iconPicker !== null}
        onClose={() => setIconPicker(null)}
        isPending={isPendingIcon}
        currentImageUrl={resolveIconUrl(currentIconValue)}
        onSelectUrl={(url) => {
          if (iconPicker) handleSaveMarchIcon(iconPicker.marchId, iconPicker.slot, url);
        }}
        onUpload={handleUploadMarchIcon}
        onRemove={() => {
          if (iconPicker) handleSaveMarchIcon(iconPicker.marchId, iconPicker.slot, null);
        }}
      />
    </div>
  );
}
