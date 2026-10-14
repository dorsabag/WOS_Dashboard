// ── Bonus breakdown data migrated from "WOS Stats / Stat Calculator" spreadsheet ──

export type BonusCategory =
  | "base"
  | "game-system"
  | "expert"
  | "gear"
  | "other"
  | "total";

export interface BonusRow {
  source: string;
  /** Stable key used as the DB storage key; empty string for computed rows */
  sourceKey: string;
  category: BonusCategory;
  /** true = value is derived from another profile section, not directly editable */
  isComputed: boolean;
  /** Values in the legacy column order; pad() inserts the new Economy columns */
  v: string[];
}

// Column order matches the spreadsheet, with the added gathering-speed fields
// grouped into Economy after Training Capacity.
export const BONUS_COL_KEYS = [
  "researchSpeed",
  "constructionSpeed",
  "healingSpeed",
  "infirmaryCapacity",
  "trainingSpeed",
  "trainingCapacity",
  "resourceGatheringSpeed",
  "meatGatheringSpeed",
  "woodGatheringSpeed",
  "coalGatheringSpeed",
  "ironGatheringSpeed",
  "resourceProductionSpeed",
  "huntingMarchSpeed",
  "troopsMarchSpeed",
  "rallyCapacity",
  "deploymentCapacity",
  "troopsAtk",
  "troopsDef",
  "troopsLeth",
  "troopsHp",
  "infAtk",
  "infDef",
  "infLeth",
  "infHp",
  "lancerAtk",
  "lancerDef",
  "lancerLeth",
  "lancerHp",
  "marksmanAtk",
  "marksmanDef",
  "marksmanLeth",
  "marksmanHp",
] as const;

export type BonusColKey = (typeof BONUS_COL_KEYS)[number];

export interface BonusColDef {
  key: BonusColKey;
  label: string;
  short: string;
  /** true = plain number (capacity), false = percentage */
  isNumber: boolean;
}

export interface BonusColGroup {
  key: string;
  label: string;
  cols: BonusColDef[];
}

const ALL_COL_DEFS: BonusColDef[] = [
  { key: "researchSpeed",     label: "Research Speed",      short: "Res Spd",   isNumber: false },
  { key: "constructionSpeed", label: "Construction Speed",  short: "Con Spd",   isNumber: false },
  { key: "healingSpeed",      label: "Healing Speed",       short: "Heal Spd",  isNumber: false },
  { key: "infirmaryCapacity", label: "Infirmary Capacity",  short: "Infirm",    isNumber: true  },
  { key: "trainingSpeed",     label: "Training Speed",      short: "Train Spd", isNumber: false },
  { key: "trainingCapacity",  label: "Training Cap",        short: "Train Cap", isNumber: true  },
  { key: "resourceGatheringSpeed", label: "Resource Gathering Speed", short: "Resource Gathering Speed", isNumber: false },
  { key: "meatGatheringSpeed",     label: "Meat Gathering Speed",     short: "Meat Gathering Speed", isNumber: false },
  { key: "woodGatheringSpeed",     label: "Wood Gathering Speed",     short: "Wood Gathering Speed", isNumber: false },
  { key: "coalGatheringSpeed",     label: "Coal Gathering Speed",     short: "Coal Gathering Speed", isNumber: false },
  { key: "ironGatheringSpeed",     label: "Iron Gathering Speed",     short: "Iron Gathering Speed", isNumber: false },
  { key: "resourceProductionSpeed", label: "Resource Production Speed", short: "Resource Production Speed", isNumber: false },
  { key: "huntingMarchSpeed", label: "Hunting March Speed", short: "Hunt Spd",  isNumber: false },
  { key: "troopsMarchSpeed",  label: "Troops March Speed",  short: "March Spd", isNumber: false },
  { key: "rallyCapacity",     label: "Rally Capacity",      short: "Rally Cap", isNumber: true  },
  { key: "deploymentCapacity",label: "Deployment Capacity", short: "Deploy",    isNumber: true  },
  { key: "troopsAtk",  label: "Troops Attack",       short: "T.ATK",  isNumber: false },
  { key: "troopsDef",  label: "Troops Defense",      short: "T.DEF",  isNumber: false },
  { key: "troopsLeth", label: "Troops Lethality",    short: "T.LETH", isNumber: false },
  { key: "troopsHp",   label: "Troops Health",       short: "T.HP",   isNumber: false },
  { key: "infAtk",     label: "Infantry Attack",     short: "I.ATK",  isNumber: false },
  { key: "infDef",     label: "Infantry Defense",    short: "I.DEF",  isNumber: false },
  { key: "infLeth",    label: "Infantry Lethality",  short: "I.LETH", isNumber: false },
  { key: "infHp",      label: "Infantry Health",     short: "I.HP",   isNumber: false },
  { key: "lancerAtk",  label: "Lancer Attack",       short: "L.ATK",  isNumber: false },
  { key: "lancerDef",  label: "Lancer Defense",      short: "L.DEF",  isNumber: false },
  { key: "lancerLeth", label: "Lancer Lethality",    short: "L.LETH", isNumber: false },
  { key: "lancerHp",   label: "Lancer Health",       short: "L.HP",   isNumber: false },
  { key: "marksmanAtk",  label: "Marksman Attack",    short: "M.ATK",  isNumber: false },
  { key: "marksmanDef",  label: "Marksman Defense",   short: "M.DEF",  isNumber: false },
  { key: "marksmanLeth", label: "Marksman Lethality", short: "M.LETH", isNumber: false },
  { key: "marksmanHp",   label: "Marksman Health",    short: "M.HP",   isNumber: false },
];

export const BONUS_COL_GROUPS: BonusColGroup[] = [
  {
    key: "all",
    label: "All",
    cols: ALL_COL_DEFS,
  },
  {
    key: "economy",
    label: "Economy",
    cols: ALL_COL_DEFS.slice(0, 12),
  },
  {
    key: "march",
    label: "March",
    cols: ALL_COL_DEFS.slice(12, 16),
  },
  {
    key: "all-troops",
    label: "All Troops",
    cols: ALL_COL_DEFS.slice(16, 20),
  },
  {
    key: "infantry",
    label: "Infantry",
    cols: ALL_COL_DEFS.slice(20, 24),
  },
  {
    key: "lancer",
    label: "Lancer",
    cols: ALL_COL_DEFS.slice(24, 28),
  },
  {
    key: "marksman",
    label: "Marksman",
    cols: ALL_COL_DEFS.slice(28, 32),
  },
];

/** Parse a bonus cell string to a plain float (strips %, commas, spaces) */
export function parseNum(val: string): number {
  if (!val) return 0;
  return parseFloat(val.replace(/%/g, "").replace(/,/g, "").trim()) || 0;
}

// Existing seed arrays use the original 26-column order. Insert the new
// percentage fields after Training Capacity so old values remain aligned.
function pad(arr: string[]): string[] {
  const out = [...arr];
  out.splice(6, 0, "", "", "", "", "", "");
  while (out.length < BONUS_COL_KEYS.length) out.push("");
  return out.slice(0, BONUS_COL_KEYS.length);
}

/** Get the initial spreadsheet value for a column key from a BonusRow */
export function getBonusValue(row: BonusRow, key: BonusColKey): string {
  const idx = BONUS_COL_KEYS.indexOf(key);
  return idx >= 0 ? (row.v[idx] ?? "") : "";
}

// ── Row data (source order matches spreadsheet rows 2-26) ────────────────────

export const BONUS_ROWS: BonusRow[] = [
  // ── Economy / game-system sources ───────────────────────────────────────────
  {
    source: "Base Stats",
    sourceKey: "base_stats",
    category: "base",
    isComputed: false,
    v: pad(["3.00%","0.00%","0.00%","94,000","9.50%","334","0.00%","0.00%","965,000","84,500"]),
  },
  {
    source: "Research Center",
    sourceKey: "research_center",
    category: "game-system",
    isComputed: false,
    v: pad(["23.50%","23.50%","278.80%","136,300","139.40%","186","0.00%","0.00%","0","22,800","41.00%","34.25%","36.50%","36.50%","102.75%","86.25%","91.75%","75.25%","86.25%","91.75%","80.75%","86.25%","91.75%","91.75%","80.75%","86.25%"]),
  },
  {
    source: "Island",
    sourceKey: "island",
    category: "game-system",
    isComputed: false,
    v: pad(["4.00%","10.00%","130.00%","0","5.00%","0","10.00%","5.00%","0","5,000","39.50%","38.50%","9.00%","9.00%","8.50%","8.50%","","","7.50%","8.50%","0.00%","","7.50%","12.50%"]),
  },
  {
    source: "War Academy",
    sourceKey: "war_academy",
    category: "game-system",
    isComputed: false,
    v: pad(["2.50%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","6,000","3,000","","","","","4.00%","6.00%","15.00%","15.00%","6.00%","2.00%","15.00%","15.00%","6.00%","2.00%","15.00%","15.00%"]),
  },
  {
    source: "Tundra Albums",
    sourceKey: "tundra_albums",
    category: "game-system",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","12.00%","10.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  // ── Experts — editable bonus overrides ───────────────────────────────────────
  {
    source: "Expert Cyrille",
    sourceKey: "expert_cyrille",
    category: "expert",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","15.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Expert Agnes",
    sourceKey: "expert_agnes",
    category: "expert",
    isComputed: false,
    v: pad(["5.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","0.00%","12.38%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Expert Holger",
    sourceKey: "expert_holger",
    category: "expert",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","13.65%","13.65%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Expert Fabian",
    sourceKey: "expert_fabian",
    category: "expert",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","0.00%","0.00%","10.13%","10.13%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Expert Valeria",
    sourceKey: "expert_valeria",
    category: "expert",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","0.00%","0.00%","16.40%","16.40%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Expert Baldur",
    sourceKey: "expert_baldur",
    category: "expert",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","5.55%","5.55%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Expert Ronne",
    sourceKey: "expert_ronne",
    category: "expert",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","1.73%","1.73%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Expert Romulus",
    sourceKey: "expert_romulus",
    category: "expert",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","40,000","10,000","6.50%","6.50%","26.00%","26.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Expert Kathy",
    sourceKey: "expert_kathy",
    category: "expert",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  // ── Other editable sources ────────────────────────────────────────────────────
  {
    source: "VIP Lv. 12",
    sourceKey: "vip",
    category: "game-system",
    isComputed: false,
    v: pad(["0.00%","20.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","16.00%","16.00%","16.00%","16.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Alliance Tech",
    sourceKey: "alliance_tech",
    category: "game-system",
    isComputed: false,
    v: pad(["10.00%","10.00%","20.00%","0","10.00%","0","0.00%","5.00%","0","0","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%","5.00%"]),
  },
  {
    source: "Alliance Occupation",
    sourceKey: "alliance_occupation",
    category: "game-system",
    isComputed: false,
    v: pad(["8.00%","5.00%","0.00%","0","5.00%","0","0.00%","0.00%","0","0","13.00%","5.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Alliance Territory",
    sourceKey: "alliance_territory",
    category: "game-system",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Hero Skill",
    sourceKey: "hero_skill",
    category: "game-system",
    isComputed: false,
    v: pad(["15.00%","15.00%","50.00%","0","20.00%","0","0.00%","0.00%","0","0","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Hero Gear",
    sourceKey: "hero_gear",
    category: "game-system",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Skin Bonus",
    sourceKey: "skin_bonus",
    category: "other",
    isComputed: false,
    v: pad(["0.00%","1.00%","0.00%","0","0.00%","0","75.00%","0.00%","0","0","14.00%","33.00%","3.00%","1.50%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  {
    source: "Skins Medallion",
    sourceKey: "skins_medallion",
    category: "other",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  // ── Gear / charm / pet — editable bonus sources ──────────────────────────────
  {
    source: "Chief Gear Bonus",
    sourceKey: "chief_gear_bonus",
    category: "gear",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","2,900","0.00%","0.00%","0.00%","0.00%","255.00%","255.00%","0.00%","0.00%","221.00%","221.00%","0.00%","0.00%","246.50%","246.50%","0.00%","0.00%"]),
  },
  {
    source: "Chief Charms Bonus",
    sourceKey: "chief_charms_bonus",
    category: "gear",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0","0.00%","0","0.00%","0.00%","0","0","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","330.00%","330.00%","0.00%","0.00%","226.25%","226.25%","0.00%","0.00%","270.00%","270.00%"]),
  },
  {
    source: "Pets (Permanent)",
    sourceKey: "pets_permanent",
    category: "other",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0","0","183.76%","183.76%","0.00%","0.00%","0.00%","0.00%","115.03%","118.27%","0.00%","0.00%","114.54%","117.80%","0.00%","0.00%","117.17%","116.60%"]),
  },
  {
    source: "Other",
    sourceKey: "other",
    category: "other",
    isComputed: false,
    v: pad(["0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","2,000","500","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%","0.00%"]),
  },
  // ── Totals — computed ────────────────────────────────────────────────────────
  {
    source: "Total Bonus",
    sourceKey: "",
    category: "total",
    isComputed: true,
    v: pad(["68.00%","84.50%","478.80%","136,300","179.40%","186","85.00%","10.00%","48,000","44,200","366.69%","365.32%","122.03%","120.53%","375.25%","360.75%","556.78%","543.52%","325.75%","328.25%","441.54%","450.30%","356.75%","357.75%","487.92%","492.85%"]),
  },
  {
    source: "Total Incl. Base",
    sourceKey: "",
    category: "total",
    isComputed: true,
    v: pad(["71.00%","84.50%","478.80%","230,300","188.90%","520","85.00%","10.00%","1,013,000","128,700","366.69%","365.32%","122.03%","120.53%","375.25%","360.75%","556.78%","543.52%","325.75%","328.25%","441.54%","450.30%","356.75%","357.75%","487.92%","492.85%"]),
  },
];
