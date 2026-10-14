"use client";

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
  BadgePercent,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  FileUp,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  Package,
  PawPrint,
  Search,
  Shield,
  Sparkles,
  Sword,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type SectionKey =
  | "overview"
  | "chief-gear"
  | "chief-charms"
  | "hero-gear"
  | "heroes"
  | "pets"
  | "experts"
  | "research"
  | "buildings"
  | "inventory"
  | "bonuses"
  | "calculators";

type ProfileSection = {
  key: SectionKey;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  prefixes: string[];
};

const SECTIONS: ProfileSection[] = [
  { key: "overview", label: "Overview", description: "Your account at a glance", icon: LayoutDashboard, prefixes: ["profileRallyCapacityBase", "profileSpeedups"] },
  { key: "chief-gear", label: "Chief Gear", description: "Your six chief equipment pieces", icon: Shield, prefixes: ["profileChiefGear"] },
  { key: "chief-charms", label: "Chief Charms", description: "18 charms by troop type", icon: Sparkles, prefixes: ["profileChiefCharms"] },
  { key: "hero-gear", label: "Hero Gear", description: "Gear sets and forging supplies", icon: Sword, prefixes: ["profileHeroGear", "profileHeroGearInventory"] },
  { key: "heroes", label: "Heroes", description: "Levels, stars, skills, and widgets", icon: UsersRound, prefixes: ["profileHeroRoster"] },
  { key: "pets", label: "Pets", description: "Beasts and pet supplies", icon: PawPrint, prefixes: ["profilePetLevels", "profilePetInventory"] },
  { key: "experts", label: "Experts", description: "Experts, skills, and relationships", icon: GraduationCap, prefixes: ["profileExpertLevels", "profileExpertSkillStates", "profileExpertRelStates", "profileExpertInventory"] },
  { key: "research", label: "Research", description: "Research Center and War Academy", icon: FlaskConical, prefixes: ["profileResearchLevels", "profileWarAcademyLevels"] },
  { key: "buildings", label: "Buildings", description: "Building progress from your saved account data", icon: Building2, prefixes: [] },
  { key: "inventory", label: "Resources", description: "Resources and backpack items", icon: Package, prefixes: ["profileResources", "profileBackpack"] },
  { key: "bonuses", label: "Bonuses", description: "Island, skin, and pet bonuses", icon: BadgePercent, prefixes: ["profileIslandBonuses", "profileSkinBonuses", "profilePetTotalBonuses"] },
  {
    key: "calculators",
    label: "Planning & Calculators",
    description: "Targets, event plans, and time settings",
    icon: Calculator,
    prefixes: [
      "chiefGearCalculator",
      "chiefCharmsCalculator",
      "heroGearCalculator",
      "heroUpgradeCalculator",
      "petCalculator",
      "expertsCalculator",
      "researchUpgradesCalculator",
      "warAcademyCalculator",
      "troopsCalculator",
      "allianceShowdownCalculator",
      "koiCalculator",
      "svsCalculator",
      "researchSpeedSettings",
      "trainingSpeedSettings",
      "buildingCalculator",
      "constructionSpeedSettings",
    ],
  },
];

const VALUE_LABELS: Record<string, string> = {
  atk: "Attack",
  def: "Defense",
  hp: "Health",
  xp: "XP",
  id: "Reference",
  fc: "Fire Crystal",
  inf: "Infantry",
  lan: "Lancer",
  mark: "Marksman",
  pct: "%",
  all: "All Troops",
  is: "",
};

const CHIEF_GEAR_LABELS: Record<string, string> = {
  helmet: "Helmet",
  watch: "Watch",
  armor: "Armor",
  weapon: "Weapon",
  boots: "Boots",
  belt: "Belt",
};

function words(value: string) {
  const cleaned = value
    .replace(/_target$/i, " target")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d+)/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .trim();
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(part => VALUE_LABELS[part.toLowerCase()] ?? `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .filter(Boolean)
    .join(" ");
}

function sectionForField(field: string): ProfileSection {
  return SECTIONS.find(section => section.key !== "overview" && section.prefixes.some(prefix => field.startsWith(prefix)))
    ?? SECTIONS.find(section => section.key === "calculators")!;
}

function pathParts(field: string) {
  const section = sectionForField(field);
  const prefix = section.prefixes.find(item => field.startsWith(item)) ?? "";
  const path = field.slice(prefix.length).replace(/^\./, "");
  if (!path) return [section.label];
  return path.split(".").flatMap(part => {
    const matches = [...part.matchAll(/^(.+?)?\[(\d+)\]$/g)];
    if (!matches.length) return [words(part)];
    const [, property, number] = matches[0];
    return [property ? words(property) : "Set", `#${Number(number) + 1}`];
  });
}

function fieldLabel(field: string) {
  const parts = pathParts(field);
  return parts.at(-1) || "Saved setting";
}

function fieldGroup(field: string) {
  const parts = pathParts(field);
  return parts.length > 1 ? parts.slice(0, -1).join(" · ") : "Profile details";
}

function valueText(value: ProfileValue | undefined) {
  if (value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  return String(value);
}

function EditableField({
  field,
  value,
  saving,
  onSave,
}: {
  field: string;
  value: ProfileValue;
  saving: boolean;
  onSave: (next: ProfileValue) => void;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => setRaw(String(value)), [value]);

  const commit = () => {
    const next = typeof value === "number" ? Number(raw) : raw;
    if ((typeof value === "number" && !Number.isFinite(next)) || next === value) {
      setRaw(String(value));
      return;
    }
    onSave(next);
  };

  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/50 px-3 py-2.5 transition-colors hover:border-primary/35 hover:bg-primary/[0.025]">
      <label className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{fieldLabel(field)}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{fieldGroup(field)}</span>
      </label>
      <div className="w-32 shrink-0">
        {typeof value === "boolean" ? (
          <label className="flex h-9 cursor-pointer items-center justify-between rounded-md border border-border bg-card px-2.5 text-xs font-medium">
            <span>{value ? "On" : "Off"}</span>
            <input
              aria-label={`Toggle ${fieldLabel(field)}`}
              checked={value}
              className="h-4 w-4 accent-primary"
              disabled={saving}
              type="checkbox"
              onChange={event => onSave(event.target.checked)}
            />
          </label>
        ) : (
          <Input
            aria-label={fieldLabel(field)}
            className="h-9 text-right text-sm"
            disabled={saving}
            inputMode={typeof value === "number" ? "decimal" : undefined}
            type={typeof value === "number" ? "number" : "text"}
            value={raw}
            onBlur={commit}
            onChange={event => setRaw(event.target.value)}
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
    </div>
  );
}

function ProfileFields({
  entries,
  saving,
  onSave,
}: {
  entries: Array<[string, ProfileValue]>;
  saving: boolean;
  onSave: (field: string, value: ProfileValue) => void;
}) {
  const groups = useMemo(() => {
    const grouped = new Map<string, Array<[string, ProfileValue]>>();
    entries.forEach(entry => {
      const group = fieldGroup(entry[0]);
      grouped.set(group, [...(grouped.get(group) ?? []), entry]);
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  if (!entries.length) {
    return <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">No saved values in this area yet.</div>;
  }

  return (
    <div className="space-y-3">
      {groups.map(([group, groupEntries], index) => (
        <details className="overflow-hidden rounded-xl border border-border bg-card" key={group} open={groups.length <= 5 || index < 2}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-muted/30 px-4 py-3 text-sm font-semibold transition hover:bg-primary/[0.08]">
            <span>{group}</span>
            <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              {groupEntries.length} saved value{groupEntries.length === 1 ? "" : "s"}
              <ChevronRight className="h-4 w-4 transition-transform [details[open]_&]:rotate-90" />
            </span>
          </summary>
          <div className="grid gap-2 border-t border-border p-3 md:grid-cols-2">
            {groupEntries
              .sort(([a], [b]) => fieldLabel(a).localeCompare(fieldLabel(b)))
              .map(([field, value]) => <EditableField field={field} key={field} onSave={next => onSave(field, next)} saving={saving} value={value} />)}
          </div>
        </details>
      ))}
    </div>
  );
}

function Overview({
  values,
  setSection,
}: {
  values: Record<string, ProfileValue>;
  setSection: (section: SectionKey) => void;
}) {
  const heroCount = Object.keys(values).filter(key => key.startsWith("profileHeroRoster.") && key.endsWith(".stars")).length;
  const petCount = Object.keys(values).filter(key => key.startsWith("profilePetLevels.")).length;
  const resourceEntries = Object.entries(values).filter(([key]) => key.startsWith("profileResources."));
  const rally = values.profileRallyCapacityBase;
  const speedups = Object.entries(values).filter(([key]) => key.startsWith("profileSpeedups."));

  const cards = [
    { label: "Rally capacity", value: valueText(rally), icon: UsersRound, section: "overview" as const },
    { label: "Heroes tracked", value: heroCount ? String(heroCount) : "—", icon: UsersRound, section: "heroes" as const },
    { label: "Pets tracked", value: petCount ? String(petCount) : "—", icon: PawPrint, section: "pets" as const },
    { label: "Gear slots", value: String(Object.keys(values).filter(key => key.startsWith("profileChiefGear.")).length), icon: Shield, section: "chief-gear" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button className="rounded-xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md" key={card.label} onClick={() => setSection(card.section)}>
              <Icon className="mb-4 h-5 w-5 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
              <p className="mt-1 truncate text-xl font-bold">{card.value}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="font-semibold">Resources on hand</h2><p className="mt-1 text-sm text-muted-foreground">Your core resource totals</p></div>
            <Button size="sm" variant="ghost" onClick={() => setSection("inventory")}>View all</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {resourceEntries.slice(0, 8).map(([key, value]) => (
              <div className="rounded-lg bg-muted/45 p-3" key={key}>
                <p className="truncate text-xs text-muted-foreground">{fieldLabel(key)}</p>
                <p className="mt-1 truncate text-sm font-semibold">{valueText(value)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="font-semibold">Speedups</h2><p className="mt-1 text-sm text-muted-foreground">Available time reductions</p></div>
            <Button size="sm" variant="ghost" onClick={() => setSection("overview")}>Edit</Button>
          </div>
          <div className="space-y-2">
            {speedups.map(([key, value]) => (
              <div className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2.5 text-sm" key={key}>
                <span className="text-muted-foreground">{fieldLabel(key)}</span><strong>{valueText(value)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PlayerProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: profile, isLoading } = useGetProfileExport();
  const previewImport = usePreviewProfileImport();
  const importExport = useImportProfileExport();
  const updateField = useUpdateProfileExportField();
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ csv: string; sourceName: string } | null>(null);
  const values = profile?.values ?? {};

  const active = SECTIONS.find(section => section.key === activeSection) ?? SECTIONS[0];
  const sectionEntries = useMemo(() => Object.entries(values).filter(([field]) => {
    if (activeSection === "overview") return active.prefixes.some(prefix => field.startsWith(prefix));
    return active.prefixes.some(prefix => field.startsWith(prefix));
  }), [active, activeSection, values]);
  const searchResults = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return Object.entries(values)
      .filter(([field, value]) => `${fieldLabel(field)} ${fieldGroup(field)} ${String(value)}`.toLowerCase().includes(needle))
      .slice(0, 9);
  }, [search, values]);

  const save = (field: string, value: ProfileValue) => {
    updateField.mutate(
      { data: { field, value, expectedImportedAt: profile?.importedAt ?? "" } },
      {
        onSuccess: data => queryClient.setQueryData(getGetProfileExportQueryKey(), data),
        onError: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileExportQueryKey() });
          toast({ title: "Could not save that change", description: "Your latest profile was reloaded.", variant: "destructive" });
        },
      },
    );
  };

  const readFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const csv = await file.text();
      setPendingImport({ csv, sourceName: file.name });
      previewImport.mutate({ data: { csv, sourceName: file.name } }, {
        onSuccess: () => setPreviewOpen(true),
        onError: () => toast({ title: "Could not preview that file", description: "Choose a valid WOS Tools CSV export.", variant: "destructive" }),
      });
    } catch {
      toast({ title: "Could not read that file", variant: "destructive" });
    } finally {
      event.target.value = "";
    }
  };

  const saveImport = () => {
    if (!pendingImport) return;
    importExport.mutate({ data: { ...pendingImport, expectedImportedAt: profile?.importedAt ?? "" } }, {
      onSuccess: data => {
        queryClient.setQueryData(getGetProfileExportQueryKey(), data);
        setPreviewOpen(false);
        setPendingImport(null);
        toast({ title: "Profile updated", description: "Your WOS Tools export was safely replaced." });
      },
      onError: () => toast({ title: "Import failed", description: "Your existing profile is unchanged.", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <div className="flex min-h-[500px] items-center justify-center text-muted-foreground"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Loading your profile</div>;
  }

  const SectionIcon = active.icon;

  return (
    <div className="mx-auto w-full max-w-[1500px] animate-in fade-in duration-300">
      <header className="mb-5 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.16] via-card to-card px-5 py-5 sm:px-7">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Whiteout Survival</p>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your equipment, progression, resources, and event plans in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <input accept=".csv,text/csv" className="hidden" onChange={readFile} ref={inputRef} type="file" />
            <Button className="gap-2" disabled={previewImport.isPending} onClick={() => inputRef.current?.click()}>
              {previewImport.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Update from WOS Tools
            </Button>
          </div>
        </div>
      </header>

      <div className="mb-4 rounded-xl border border-border bg-card p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 pl-9" onChange={event => setSearch(event.target.value)} placeholder="Find a hero, resource, upgrade, or setting" value={search} />
        </label>
        {search && (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {searchResults.length ? searchResults.map(([field, value]) => {
              const section = sectionForField(field);
              return (
                <button className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition hover:border-primary/45 hover:bg-primary/[0.04]" key={field} onClick={() => { setActiveSection(section.key); setSearch(""); }}>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{fieldLabel(field)}</span><span className="block truncate text-xs text-muted-foreground">{section.label} · {fieldGroup(field)}</span></span>
                  <span className="max-w-20 truncate text-sm font-semibold">{valueText(value)}</span>
                </button>
              );
            }) : <p className="px-1 py-2 text-sm text-muted-foreground">No matching profile details.</p>}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
        <nav aria-label="Profile sections" className="rounded-xl border border-border bg-card p-2 lg:h-fit">
          <div className="flex gap-1 overflow-x-auto lg:block">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const count = section.prefixes.reduce((sum, prefix) => sum + Object.keys(values).filter(key => key.startsWith(prefix)).length, 0);
              const activeItem = section.key === activeSection;
              return (
                <button className={`flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-left transition lg:mb-1 lg:w-full ${activeItem ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`} key={section.key} onClick={() => setActiveSection(section.key)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-sm font-medium">{section.label}</span>
                  {count > 0 && <span className={`text-xs ${activeItem ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-6 flex items-start gap-3 border-b border-border pb-5">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2.5 text-primary"><SectionIcon className="h-5 w-5" /></div>
            <div><h2 className="text-xl font-bold">{active.label}</h2><p className="mt-1 text-sm text-muted-foreground">{active.description}</p></div>
          </div>
          {activeSection === "overview"
            ? <Overview setSection={setActiveSection} values={values} />
            : activeSection === "buildings" && sectionEntries.length === 0
              ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-primary/65" />
                  <h3 className="mt-4 font-semibold">Building plans live with your calculators</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Your WOS Tools export stores building levels and construction boosts as part of the upgrade planner, so they stay together with the targets and time estimates that use them.</p>
                  <Button className="mt-5" onClick={() => setActiveSection("calculators")} variant="outline">Open building planner</Button>
                </div>
              )
            : <ProfileFields entries={sectionEntries} onSave={save} saving={updateField.isPending} />}
        </main>
      </div>

      <Dialog open={previewOpen} onOpenChange={open => !open && !importExport.isPending && setPreviewOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review your WOS Tools update</DialogTitle>
            <DialogDescription>Your current profile stays untouched until you confirm this replacement.</DialogDescription>
          </DialogHeader>
          {previewImport.data?.isValid ? (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
              <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /><span><strong>{previewImport.data.importedRows.toLocaleString()} details</strong> are ready to update from {pendingImport?.sourceName}.</span></div>
              <p className="mt-3 text-muted-foreground">Your profile will be reorganized into game sections automatically after the update.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"><p className="font-medium text-destructive">This file needs attention before it can be used.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{previewImport.data?.errors.slice(0, 6).map(error => <li key={error}>{error}</li>)}</ul></div>
          )}
          <DialogFooter>
            <Button disabled={importExport.isPending} onClick={() => setPreviewOpen(false)} variant="outline">Cancel</Button>
            <Button disabled={!previewImport.data?.isValid || importExport.isPending} onClick={saveImport}>{importExport.isPending && <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />}Update profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}