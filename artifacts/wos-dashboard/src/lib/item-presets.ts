export interface ItemPreset {
  itemName: string;
  presetName: string;
  amount: number;
  /** If true, match any item whose name contains `itemName` (case-insensitive) instead of exact match */
  matchContains?: boolean;
}

const PRESETS: ItemPreset[] = [
  { itemName: "Mythic Hero Shard",               presetName: "Max Hero",        amount: 1_075 },
  { itemName: "Mythic Expedition Skill Manual",  presetName: "Max Exp. Skills", amount: 495 },
  { itemName: "Mythic Exploration Skill Manual", presetName: "Max Exp. Skills", amount: 495 },
  { itemName: "Hero XP",                         presetName: "Max XP",          amount: 23_600_000 },
  { itemName: "XP Component (100)",              presetName: "Gear 0→100",      amount: 73_320 },
  { itemName: "Exclusive Widget",                presetName: "Hero Widget 0→10", amount: 275, matchContains: true },
];

export function getPresetsForItem(itemName: string): ItemPreset[] {
  const normalized = itemName.trim().toLowerCase();
  if (!normalized) return [];
  return PRESETS.filter(p =>
    p.matchContains
      ? normalized.includes(p.itemName.toLowerCase())
      : normalized === p.itemName.toLowerCase()
  );
}
