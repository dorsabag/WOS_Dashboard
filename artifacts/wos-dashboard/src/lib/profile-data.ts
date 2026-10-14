export type HeroClass = "infantry" | "lancer" | "marksman";
export type HeroRarity = "common" | "epic" | "legendary";

export interface HeroMeta {
  name: string;
  class: HeroClass;
  rarity: HeroRarity;
  gen: number;
}

export const HEROES: HeroMeta[] = [
  { name: "Smith", class: "infantry", rarity: "common", gen: 0 },
  { name: "Eugene", class: "infantry", rarity: "common", gen: 0 },
  { name: "Charlie", class: "lancer", rarity: "common", gen: 0 },
  { name: "Cloris", class: "marksman", rarity: "common", gen: 0 },

  { name: "Sergey", class: "infantry", rarity: "epic", gen: 0 },
  { name: "Jessie", class: "lancer", rarity: "epic", gen: 0 },
  { name: "Patrick", class: "lancer", rarity: "epic", gen: 0 },
  { name: "Walis Bokan", class: "lancer", rarity: "epic", gen: 0 },
  { name: "Ling Shuang", class: "lancer", rarity: "epic", gen: 0 },
  { name: "Gina", class: "marksman", rarity: "epic", gen: 0 },
  { name: "Bahiti", class: "marksman", rarity: "epic", gen: 0 },
  { name: "Jasser", class: "marksman", rarity: "epic", gen: 0 },
  { name: "Seo-yoon", class: "marksman", rarity: "epic", gen: 0 },

  { name: "Natalia", class: "infantry", rarity: "legendary", gen: 1 },
  { name: "Jeronimo", class: "infantry", rarity: "legendary", gen: 1 },
  { name: "Molly", class: "lancer", rarity: "legendary", gen: 1 },
  { name: "Zinman", class: "marksman", rarity: "legendary", gen: 1 },

  { name: "Flint", class: "infantry", rarity: "legendary", gen: 2 },
  { name: "Philly", class: "lancer", rarity: "legendary", gen: 2 },
  { name: "Alonso", class: "marksman", rarity: "legendary", gen: 2 },

  { name: "Logan", class: "infantry", rarity: "legendary", gen: 3 },
  { name: "Mia", class: "lancer", rarity: "legendary", gen: 3 },
  { name: "Greg", class: "marksman", rarity: "legendary", gen: 3 },

  { name: "Ahmose", class: "infantry", rarity: "legendary", gen: 4 },
  { name: "Reina", class: "lancer", rarity: "legendary", gen: 4 },
  { name: "Lynn", class: "marksman", rarity: "legendary", gen: 4 },

  { name: "Hector", class: "infantry", rarity: "legendary", gen: 5 },
  { name: "Norah", class: "lancer", rarity: "legendary", gen: 5 },
  { name: "Gwen", class: "marksman", rarity: "legendary", gen: 5 },

  { name: "Wu Ming", class: "infantry", rarity: "legendary", gen: 6 },
  { name: "Renee", class: "lancer", rarity: "legendary", gen: 6 },
  { name: "Wayne", class: "marksman", rarity: "legendary", gen: 6 },

  { name: "Edith", class: "infantry", rarity: "legendary", gen: 7 },
  { name: "Gordon", class: "lancer", rarity: "legendary", gen: 7 },
  { name: "Bradley", class: "marksman", rarity: "legendary", gen: 7 },

  { name: "Gatot", class: "infantry", rarity: "legendary", gen: 8 },
  { name: "Sonya", class: "lancer", rarity: "legendary", gen: 8 },
  { name: "Hendrik", class: "marksman", rarity: "legendary", gen: 8 },

  { name: "Magnus", class: "infantry", rarity: "legendary", gen: 9 },
  { name: "Fred", class: "lancer", rarity: "legendary", gen: 9 },
  { name: "Xura", class: "marksman", rarity: "legendary", gen: 9 },

  { name: "Gregory", class: "infantry", rarity: "legendary", gen: 10 },
  { name: "Freya", class: "lancer", rarity: "legendary", gen: 10 },
  { name: "Blanchette", class: "marksman", rarity: "legendary", gen: 10 },

  { name: "Eleonora", class: "infantry", rarity: "legendary", gen: 11 },
  { name: "Lloyd", class: "lancer", rarity: "legendary", gen: 11 },
  { name: "Rufus", class: "marksman", rarity: "legendary", gen: 11 },

  { name: "Hervor", class: "infantry", rarity: "legendary", gen: 12 },
  { name: "Karol", class: "lancer", rarity: "legendary", gen: 12 },
  { name: "Ligeia", class: "marksman", rarity: "legendary", gen: 12 },

  { name: "Gisela", class: "infantry", rarity: "legendary", gen: 13 },
  { name: "Flora", class: "lancer", rarity: "legendary", gen: 13 },
  { name: "Vulcanus", class: "marksman", rarity: "legendary", gen: 13 },

  { name: "Elif", class: "infantry", rarity: "legendary", gen: 14 },
  { name: "Dominic", class: "lancer", rarity: "legendary", gen: 14 },
  { name: "Cara", class: "marksman", rarity: "legendary", gen: 14 },

  { name: "Hank", class: "infantry", rarity: "legendary", gen: 15 },
  { name: "Estrella", class: "lancer", rarity: "legendary", gen: 15 },
  { name: "Viveca", class: "marksman", rarity: "legendary", gen: 15 },
];

export type PetRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface PetMeta {
  name: string;
  rarity: PetRarity;
  maxLevel: number;
}

export const PETS: PetMeta[] = [
  { name: "Cave Hyena", rarity: "common", maxLevel: 50 },
  { name: "Arctic Wolf", rarity: "uncommon", maxLevel: 60 },
  { name: "Musk Ox", rarity: "uncommon", maxLevel: 60 },
  { name: "Giant Tapir", rarity: "rare", maxLevel: 70 },
  { name: "Titan Roc", rarity: "rare", maxLevel: 70 },
  { name: "Giant Elk", rarity: "epic", maxLevel: 80 },
  { name: "Snow Leopard", rarity: "epic", maxLevel: 80 },
  { name: "Cave Lion", rarity: "legendary", maxLevel: 100 },
  { name: "Snow Ape", rarity: "legendary", maxLevel: 100 },
  { name: "Iron Rhino", rarity: "legendary", maxLevel: 100 },
  { name: "Saber-tooth Tiger", rarity: "legendary", maxLevel: 100 },
  { name: "Mammoth", rarity: "legendary", maxLevel: 100 },
  { name: "Frost Gorilla", rarity: "legendary", maxLevel: 100 },
  { name: "Frostscale Chameleon", rarity: "legendary", maxLevel: 100 },
];

export interface BuildingMeta {
  key: string;
  label: string;
  type: "fc" | "level";
}

export const BUILDINGS: BuildingMeta[] = [
  { key: "furnace", label: "Furnace", type: "fc" },
  { key: "infantryCamp", label: "Infantry Camp", type: "fc" },
  { key: "marksmanCamp", label: "Marksman Camp", type: "fc" },
  { key: "lancerCamp", label: "Lancer Camp", type: "fc" },
  { key: "embassy", label: "Embassy", type: "fc" },
  { key: "commandCenter", label: "Command Center", type: "fc" },
  { key: "warAcademy", label: "War Academy", type: "fc" },
  { key: "infirmary", label: "Infirmary", type: "fc" },
  { key: "researchCenter", label: "Research Center", type: "level" },
  { key: "storehouse", label: "Storehouse", type: "level" },
  { key: "huntersHut", label: "Hunter's Hut", type: "level" },
  { key: "sawmill", label: "Sawmill", type: "level" },
  { key: "coalMine", label: "Coal Mine", type: "level" },
  { key: "ironMine", label: "Iron Mine", type: "level" },
];

export const FC_LEVELS: string[] = [
  "FC 1", "FC 1-1", "FC 1-2", "FC 1-3", "FC 1-4",
  "FC 2", "FC 2-1", "FC 2-2", "FC 2-3", "FC 2-4",
  "FC 3", "FC 3-1", "FC 3-2", "FC 3-3", "FC 3-4",
  "FC 4", "FC 4-1", "FC 4-2", "FC 4-3", "FC 4-4",
  "FC 5", "FC 5-1", "FC 5-2", "FC 5-3", "FC 5-4",
  "FC 6", "FC 6-1", "FC 6-2", "FC 6-3", "FC 6-4",
  "FC 7", "FC 7-1", "FC 7-2", "FC 7-3", "FC 7-4",
];

export const CHIEF_GEAR_PIECES = [
  { key: "helmet", label: "Helmet", icon: "🪖" },
  { key: "watch", label: "Watch", icon: "⌚" },
  { key: "jacket", label: "Jacket", icon: "🧥" },
  { key: "pants", label: "Pants", icon: "👖" },
  { key: "ring", label: "Ring", icon: "💍" },
  { key: "cane", label: "Cane", icon: "🪄" },
];

export const CHIEF_GEAR_TIERS: string[] = [
  "None (Not Started)",
  "Green 0★", "Green 1★",
  "Blue 0★", "Blue 1★", "Blue 2★", "Blue 3★",
  "Purple 0★", "Purple 1★", "Purple 2★", "Purple 3★",
  "Purple T1 0★", "Purple T1 1★", "Purple T1 2★", "Purple T1 3★",
  "Gold 0★", "Gold 1★", "Gold 2★", "Gold 3★",
  "Gold T1 0★", "Gold T1 1★", "Gold T1 2★", "Gold T1 3★",
  "Gold T2 0★", "Gold T2 1★", "Gold T2 2★", "Gold T2 3★",
  "Gold T2 3★ (1/4)", "Gold T2 3★ (2/4)", "Gold T2 3★ (3/4)",
  "Red 0★", "Red 0★ (1/4)", "Red 0★ (2/4)", "Red 0★ (3/4)",
  "Red 1★", "Red 1★ (1/4)", "Red 1★ (2/4)", "Red 1★ (3/4)",
  "Red 2★", "Red 2★ (1/4)", "Red 2★ (2/4)", "Red 2★ (3/4)",
  "Red 3★", "Red 3★ (1/4)", "Red 3★ (2/4)", "Red 3★ (3/4)",
  "Red T1 0★", "Red T1 0★ (1/4)", "Red T1 0★ (2/4)", "Red T1 0★ (3/4)",
  "Red T1 1★", "Red T1 1★ (1/4)", "Red T1 1★ (2/4)", "Red T1 1★ (3/4)",
  "Red T1 2★", "Red T1 2★ (1/4)", "Red T1 2★ (2/4)", "Red T1 2★ (3/4)",
  "Red T1 3★", "Red T1 3★ (1/4)", "Red T1 3★ (2/4)", "Red T1 3★ (3/4)",
  "Red T2 0★", "Red T2 0★ (1/4)", "Red T2 0★ (2/4)", "Red T2 0★ (3/4)",
  "Red T2 1★", "Red T2 1★ (1/4)", "Red T2 1★ (2/4)", "Red T2 1★ (3/4)",
  "Red T2 2★", "Red T2 2★ (1/4)", "Red T2 2★ (2/4)", "Red T2 2★ (3/4)",
  "Red T2 3★", "Red T2 3★ (1/4)", "Red T2 3★ (2/4)", "Red T2 3★ (3/4)",
  "Red T3 0★", "Red T3 0★ (1/4)", "Red T3 0★ (2/4)", "Red T3 0★ (3/4)",
  "Red T3 1★", "Red T3 1★ (1/4)", "Red T3 1★ (2/4)", "Red T3 1★ (3/4)",
  "Red T3 2★", "Red T3 2★ (1/4)", "Red T3 2★ (2/4)", "Red T3 2★ (3/4)",
  "Red T3 3★", "Red T3 3★ (1/5)", "Red T3 3★ (2/5)", "Red T3 3★ (3/5)", "Red T3 3★ (4/5)",
  "Red T4 0★", "Red T4 0★ (1/5)", "Red T4 0★ (2/5)", "Red T4 0★ (3/5)", "Red T4 0★ (4/5)",
  "Red T4 1★", "Red T4 1★ (1/5)", "Red T4 1★ (2/5)", "Red T4 1★ (3/5)", "Red T4 1★ (4/5)",
  "Red T4 2★", "Red T4 2★ (1/5)", "Red T4 2★ (2/5)", "Red T4 2★ (3/5)", "Red T4 2★ (4/5)",
  "Red T4 3★",
];

export const CHIEF_CHARMS_STRUCTURE = [
  {
    troop: "lancer" as const,
    label: "LANCER",
    color: "#22d3ee",
    slots: [
      { key: "helmetCharm1", label: "Helmet #1", icon: "🪖" },
      { key: "helmetCharm2", label: "Helmet #2", icon: "🪖" },
      { key: "helmetCharm3", label: "Helmet #3", icon: "🪖" },
      { key: "watchCharm1", label: "Watch #1", icon: "⌚" },
      { key: "watchCharm2", label: "Watch #2", icon: "⌚" },
      { key: "watchCharm3", label: "Watch #3", icon: "⌚" },
    ],
  },
  {
    troop: "infantry" as const,
    label: "INFANTRY",
    color: "#60a5fa",
    slots: [
      { key: "jacketCharm1", label: "Jacket #1", icon: "🧥" },
      { key: "jacketCharm2", label: "Jacket #2", icon: "🧥" },
      { key: "jacketCharm3", label: "Jacket #3", icon: "🧥" },
      { key: "pantsCharm1", label: "Pants #1", icon: "👖" },
      { key: "pantsCharm2", label: "Pants #2", icon: "👖" },
      { key: "pantsCharm3", label: "Pants #3", icon: "👖" },
    ],
  },
  {
    troop: "marksman" as const,
    label: "MARKSMAN",
    color: "#fb923c",
    slots: [
      { key: "ringCharm1", label: "Ring #1", icon: "💍" },
      { key: "ringCharm2", label: "Ring #2", icon: "💍" },
      { key: "ringCharm3", label: "Ring #3", icon: "💍" },
      { key: "caneCharm1", label: "Cane #1", icon: "🪄" },
      { key: "caneCharm2", label: "Cane #2", icon: "🪄" },
      { key: "caneCharm3", label: "Cane #3", icon: "🪄" },
    ],
  },
];

export const HERO_GEAR_PIECES = [
  { key: "goggles", label: "Goggles", icon: "🥽" },
  { key: "gloves", label: "Gloves", icon: "🧤" },
  { key: "belt", label: "Belt", icon: "🎗️" },
  { key: "boots", label: "Boots", icon: "👢" },
] as const;

export const TROOP_TYPES = [
  { key: "infantry", label: "INFANTRY", color: "#60a5fa" },
  { key: "lancer", label: "LANCER", color: "#22d3ee" },
  { key: "marksman", label: "MARKSMAN", color: "#fb923c" },
] as const;

export interface ResearchItem {
  key: string;
  label: string;
}

export interface ResearchGroup {
  key: string;
  label: string;
  color: string;
  items: ResearchItem[];
}

export interface ResearchSection {
  storageKey: "warAcademy" | "researchCenter";
  label: string;
  groups: ResearchGroup[];
}

export const RESEARCH_SECTIONS: ResearchSection[] = [
  {
    storageKey: "warAcademy",
    label: "War Academy",
    groups: [
      {
        key: "infantry",
        label: "Infantry",
        color: "#60a5fa",
        items: [
          { key: "infantryAtk", label: "Infantry Attack" },
          { key: "infantryDef", label: "Infantry Defense" },
          { key: "infantryHp", label: "Infantry HP" },
          { key: "infantryLethality", label: "Infantry Lethality" },
          { key: "infantryMarchSpeed", label: "Infantry March Speed" },
          { key: "infantryLoad", label: "Infantry Load" },
          { key: "infantryTrainingSpeed", label: "Infantry Training Speed" },
          { key: "infantryTrainingCapacity", label: "Infantry Training Capacity" },
          { key: "infantryRallyAtk", label: "Infantry Rally Attack" },
          { key: "infantryRallyDef", label: "Infantry Rally Defense" },
          { key: "infantryRallyHp", label: "Infantry Rally HP" },
          { key: "infantryRallyLethality", label: "Infantry Rally Lethality" },
          { key: "exaltedInfantry", label: "Exalted Infantry" },
        ],
      },
      {
        key: "lancer",
        label: "Lancer",
        color: "#22d3ee",
        items: [
          { key: "lancerAtk", label: "Lancer Attack" },
          { key: "lancerDef", label: "Lancer Defense" },
          { key: "lancerHp", label: "Lancer HP" },
          { key: "lancerLethality", label: "Lancer Lethality" },
          { key: "lancerMarchSpeed", label: "Lancer March Speed" },
          { key: "lancerLoad", label: "Lancer Load" },
          { key: "lancerTrainingSpeed", label: "Lancer Training Speed" },
          { key: "lancerTrainingCapacity", label: "Lancer Training Capacity" },
          { key: "lancerRallyAtk", label: "Lancer Rally Attack" },
          { key: "lancerRallyDef", label: "Lancer Rally Defense" },
          { key: "lancerRallyHp", label: "Lancer Rally HP" },
          { key: "lancerRallyLethality", label: "Lancer Rally Lethality" },
          { key: "exaltedLancer", label: "Exalted Lancer" },
        ],
      },
      {
        key: "marksman",
        label: "Marksman",
        color: "#fb923c",
        items: [
          { key: "marksmanAtk", label: "Marksman Attack" },
          { key: "marksmanDef", label: "Marksman Defense" },
          { key: "marksmanHp", label: "Marksman HP" },
          { key: "marksmanLethality", label: "Marksman Lethality" },
          { key: "marksmanMarchSpeed", label: "Marksman March Speed" },
          { key: "marksmanLoad", label: "Marksman Load" },
          { key: "marksmanTrainingSpeed", label: "Marksman Training Speed" },
          { key: "marksmanTrainingCapacity", label: "Marksman Training Capacity" },
          { key: "marksmanRallyAtk", label: "Marksman Rally Attack" },
          { key: "marksmanRallyDef", label: "Marksman Rally Defense" },
          { key: "marksmanRallyHp", label: "Marksman Rally HP" },
          { key: "marksmanRallyLethality", label: "Marksman Rally Lethality" },
          { key: "exaltedMarksman", label: "Exalted Marksman" },
        ],
      },
      {
        key: "general",
        label: "General",
        color: "#a78bfa",
        items: [
          { key: "deploymentCapacity", label: "Deployment Capacity" },
          { key: "rallyCapacity", label: "Rally Capacity" },
          { key: "marchSlots", label: "March Slots" },
          { key: "healingSpeed", label: "Healing Speed" },
          { key: "healingCapacity", label: "Healing Capacity" },
        ],
      },
    ],
  },
  {
    storageKey: "researchCenter",
    label: "Research Center",
    groups: [
      {
        key: "development",
        label: "Development",
        color: "#34d399",
        items: [
          { key: "constructionSpeed", label: "Construction Speed" },
          { key: "researchSpeed", label: "Research Speed" },
          { key: "trainingSpeed", label: "Training Speed" },
          { key: "foodProduction", label: "Food Production" },
          { key: "woodProduction", label: "Wood Production" },
          { key: "coalProduction", label: "Coal Production" },
          { key: "ironProduction", label: "Iron Production" },
          { key: "resourceProduction", label: "Resource Production" },
          { key: "gatheringSpeed", label: "Gathering Speed" },
          { key: "gatheringLoad", label: "Gathering Load" },
          { key: "hospitalCapacity", label: "Hospital Capacity" },
          { key: "rescuingCapacity", label: "Rescuing Capacity" },
          { key: "trapCapacity", label: "Trap Capacity" },
          { key: "trapAtk", label: "Trap Attack" },
          { key: "trapDef", label: "Trap Defense" },
          { key: "trapHp", label: "Trap HP" },
        ],
      },
    ],
  },
];

export interface ExpertMeta {
  id: string;
  name: string;
  focus: string;
}

export interface ExpertGen {
  gen: number;
  label: string;
  color: string;
  experts: ExpertMeta[];
}

export const EXPERT_GENS: ExpertGen[] = [
  {
    gen: 1,
    label: "Gen 1",
    color: "#60a5fa",
    experts: [
      { id: "Agnes", name: "Agnes", focus: "Research" },
      { id: "Jasser", name: "Jasser", focus: "Leadership" },
      { id: "LingXue", name: "Ling Xue", focus: "Trade" },
      { id: "Zinman", name: "Zinman", focus: "Construction" },
      { id: "Evony", name: "Evony", focus: "Training" },
      { id: "Molly", name: "Molly", focus: "Development" },
      { id: "Patrick", name: "Patrick", focus: "Combat" },
      { id: "Sergey", name: "Sergey", focus: "Military" },
    ],
  },
  {
    gen: 2,
    label: "Gen 2",
    color: "#c084fc",
    experts: [
      { id: "Vera", name: "Vera", focus: "Resources" },
      { id: "Charlotte", name: "Charlotte", focus: "Alliance" },
      { id: "Harold", name: "Harold", focus: "Logistics" },
      { id: "Dave", name: "Dave", focus: "Patrol" },
      { id: "Nina", name: "Nina", focus: "Medical" },
      { id: "Trish", name: "Trish", focus: "Scouting" },
    ],
  },
  {
    gen: 3,
    label: "Gen 3",
    color: "#f59e0b",
    experts: [
      { id: "Ingrid", name: "Ingrid", focus: "Research" },
      { id: "Jesse", name: "Jesse", focus: "Combat" },
      { id: "Liang", name: "Liang", focus: "Defense" },
      { id: "Norah", name: "Norah", focus: "Strategy" },
      { id: "Hector", name: "Hector", focus: "Assault" },
    ],
  },
];

export const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
};

export const TROOP_COLORS: Record<string, string> = {
  infantry: "#60a5fa",
  lancer: "#22d3ee",
  marksman: "#fb923c",
};

export const TROOP_LABELS: Record<string, string> = {
  infantry: "Infantry",
  lancer: "Lancer",
  marksman: "Marksman",
};
