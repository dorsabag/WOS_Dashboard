export interface CategoryColor {
  banner: string;
  border: string;
  section: string;
}

export const DEFAULT_CATEGORY_COLOR: CategoryColor = {
  banner: "bg-muted/40 text-muted-foreground border border-border/40",
  border: "border-border/50",
  section: "bg-muted/10 border border-border/20",
};

const COLORS: Record<string, CategoryColor> = {
  violet: {
    banner: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    border: "border-violet-500/40",
    section: "bg-violet-500/5 border border-violet-500/15",
  },
  pink: {
    banner: "bg-pink-500/15 text-pink-300 border border-pink-500/30",
    border: "border-pink-500/40",
    section: "bg-pink-500/5 border border-pink-500/15",
  },
  blue: {
    banner: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    border: "border-blue-500/40",
    section: "bg-blue-500/5 border border-blue-500/15",
  },
  red: {
    banner: "bg-red-500/15 text-red-300 border border-red-500/30",
    border: "border-red-500/40",
    section: "bg-red-500/5 border border-red-500/15",
  },
  orange: {
    banner: "bg-orange-500/15 text-orange-300 border border-orange-500/30",
    border: "border-orange-500/40",
    section: "bg-orange-500/5 border border-orange-500/15",
  },
  rose: {
    banner: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    border: "border-rose-500/40",
    section: "bg-rose-500/5 border border-rose-500/15",
  },
  stone: {
    banner: "bg-stone-500/15 text-stone-300 border border-stone-500/30",
    border: "border-stone-500/40",
    section: "bg-stone-500/5 border border-stone-500/15",
  },
  sky: {
    banner: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    border: "border-sky-500/40",
    section: "bg-sky-500/5 border border-sky-500/15",
  },
  yellow: {
    banner: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
    border: "border-yellow-500/40",
    section: "bg-yellow-500/5 border border-yellow-500/15",
  },
  teal: {
    banner: "bg-teal-500/15 text-teal-300 border border-teal-500/30",
    border: "border-teal-500/40",
    section: "bg-teal-500/5 border border-teal-500/15",
  },
  green: {
    banner: "bg-green-500/15 text-green-300 border border-green-500/30",
    border: "border-green-500/40",
    section: "bg-green-500/5 border border-green-500/15",
  },
  amber: {
    banner: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    border: "border-amber-500/40",
    section: "bg-amber-500/5 border border-amber-500/15",
  },
  slate: {
    banner: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
    border: "border-slate-500/40",
    section: "bg-slate-500/5 border border-slate-500/15",
  },
  cyan: {
    banner: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
    border: "border-cyan-500/40",
    section: "bg-cyan-500/5 border border-cyan-500/15",
  },
  fuchsia: {
    banner: "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30",
    border: "border-fuchsia-500/40",
    section: "bg-fuchsia-500/5 border border-fuchsia-500/15",
  },
  lime: {
    banner: "bg-lime-500/15 text-lime-300 border border-lime-500/30",
    border: "border-lime-500/40",
    section: "bg-lime-500/5 border border-lime-500/15",
  },
  indigo: {
    banner: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
    border: "border-indigo-500/40",
    section: "bg-indigo-500/5 border border-indigo-500/15",
  },
};

const NAMED_COLORS: Record<string, CategoryColor> = {
  "CHARMS":         COLORS.violet,
  "CHIEF CHARMS":   COLORS.violet,
  "CHIEF GEAR":     COLORS.pink,
  "EXPERTS":        COLORS.blue,
  "FC":             COLORS.red,
  "FIRE CRYSTALS":  COLORS.red,
  "HERO GEAR":      COLORS.orange,
  "HEROES":         COLORS.rose,
  "PETS":           COLORS.stone,
  "RESEARCH":       COLORS.sky,
  "SHARDS":         COLORS.yellow,
  "SKILL BOOKS":    COLORS.teal,
  "SKILL MANUALS":  COLORS.teal,
  "XP PTS":         COLORS.green,
  "BUILDINGS":      COLORS.amber,
  "MISC":           COLORS.slate,
};

const FALLBACK_ORDER = [
  "violet", "pink", "blue", "red", "orange", "rose",
  "stone", "sky", "yellow", "teal", "green", "amber",
  "slate", "cyan", "fuchsia", "lime", "indigo",
];

function normalizeCategoryName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getCategoryColor(name: string | undefined | null): CategoryColor {
  if (!name) return DEFAULT_CATEGORY_COLOR;
  const normalized = normalizeCategoryName(name);
  if (NAMED_COLORS[normalized]) return NAMED_COLORS[normalized];
  const hue = FALLBACK_ORDER[hashString(normalized) % FALLBACK_ORDER.length];
  return COLORS[hue];
}
