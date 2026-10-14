import { Router } from "express";
import { db, profileTable } from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  GetProfileExportResponse,
  ImportProfileExportBody,
  ImportProfileExportResponse,
  PreviewProfileImportBody,
  PreviewProfileImportResponse,
  UpdateProfileExportFieldBody,
  UpdateProfileExportFieldResponse,
} from "@workspace/api-zod";

const router = Router();
const WOS_TOOLS_SEED_FILE = "0_wostools-profile-main-2026-08-22_1787438594749.csv";

type ProfileValue = string | number | boolean;

interface ProfileExport {
  version: 1;
  values: Record<string, ProfileValue>;
  importedAt: string;
  sourceName?: string;
  sourceProfiles?: string[];
}

interface CsvParseResult {
  profileExport: ProfileExport;
  groupCounts: Record<string, number>;
  errors: string[];
}

function emptyProfileExport(): ProfileExport {
  return { version: 1, values: {}, importedAt: new Date(0).toISOString() };
}

function asProfileExport(value: unknown): ProfileExport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyProfileExport();
  const candidate = value as Partial<ProfileExport>;
  if (!candidate.values || typeof candidate.values !== "object" || Array.isArray(candidate.values)) {
    return emptyProfileExport();
  }
  return {
    version: 1,
    values: candidate.values as Record<string, ProfileValue>,
    importedAt: typeof candidate.importedAt === "string" ? candidate.importedAt : new Date(0).toISOString(),
    ...(typeof candidate.sourceName === "string" ? { sourceName: candidate.sourceName } : {}),
    ...(Array.isArray(candidate.sourceProfiles) && candidate.sourceProfiles.every(profile => typeof profile === "string")
      ? { sourceProfiles: candidate.sourceProfiles }
      : {}),
  };
}

function parseCsvRecords(csv: string): { rows: string[][]; error?: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (char === "\"") {
      if (quoted && csv[index + 1] === "\"") {
        field += "\"";
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[index + 1] === "\n") index++;
      row.push(field);
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) return { rows, error: "The CSV contains an unclosed quoted value." };
  row.push(field);
  if (row.some(value => value !== "")) rows.push(row);
  return { rows };
}

function normalizeCsvValue(raw: string): ProfileValue {
  const value = raw.trim();
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  const normalizedNumber = value.replace(/,/g, "");
  if (/^-?\d+(?:\.\d+)?$/.test(normalizedNumber)) return Number(normalizedNumber);
  return value;
}

function isValidExportField(field: string) {
  return field.length > 0 && field.length <= 512 && !/[\u0000-\u001F]/.test(field);
}

function parseProfileCsv(csv: string, sourceName?: string): CsvParseResult {
  const parsedCsv = parseCsvRecords(csv.replace(/^\uFEFF/, ""));
  const errors: string[] = [];
  const values: Record<string, ProfileValue> = {};
  const groupCounts: Record<string, number> = {};
  const profileNames = new Set<string>();
  const seenFields = new Map<string, string>();

  if (parsedCsv.error) {
    return { profileExport: emptyProfileExport(), groupCounts, errors: [parsedCsv.error] };
  }
  const { rows } = parsedCsv;
  if (rows.length < 2) {
    return { profileExport: emptyProfileExport(), groupCounts, errors: ["The CSV needs a header and at least one profile row."] };
  }
  const header = rows[0].map(value => value.trim());
  if (header.join("|") !== "Profile|Field|Value") {
    return { profileExport: emptyProfileExport(), groupCounts, errors: ["Expected CSV columns: Profile, Field, Value."] };
  }

  for (let lineNumber = 2; lineNumber <= rows.length; lineNumber++) {
    const row = rows[lineNumber - 1];
    if (row.length !== 3) {
      errors.push(`Row ${lineNumber} does not contain exactly three columns.`);
      continue;
    }
    const [rawProfile, field, rawValue] = row;
    const profile = rawProfile.trim();
    if (!profile || !field.trim()) {
      errors.push(`Row ${lineNumber} is missing a profile or field name.`);
      continue;
    }
    if (!isValidExportField(field)) {
      errors.push(`Row ${lineNumber} has an invalid field name: ${field}.`);
      continue;
    }
    if (seenFields.has(field)) {
      const firstProfile = seenFields.get(field);
      errors.push(
        firstProfile === profile
          ? `Row ${lineNumber} repeats ${field} for profile ${profile}.`
          : `Row ${lineNumber} repeats ${field} for profile ${profile}; it is already present in ${firstProfile}.`,
      );
      continue;
    }
    seenFields.set(field, profile);
    profileNames.add(profile);
    values[field] = normalizeCsvValue(rawValue);
    const group = field.split(".")[0];
    groupCounts[group] = (groupCounts[group] ?? 0) + 1;
  }

  return {
    profileExport: {
      version: 1,
      values,
      importedAt: new Date().toISOString(),
      ...(sourceName ? { sourceName } : {}),
      sourceProfiles: [...profileNames].sort(),
    },
    groupCounts,
    errors,
  };
}

async function getSingletonProfile() {
  const [profile] = await db
    .select()
    .from(profileTable)
    .orderBy(asc(profileTable.id))
    .limit(1);
  return profile;
}

async function loadSeedProfileExport(): Promise<ProfileExport> {
  const candidates = [
    path.resolve(process.cwd(), "attached_assets", WOS_TOOLS_SEED_FILE),
    path.resolve(process.cwd(), "../../attached_assets", WOS_TOOLS_SEED_FILE),
  ];
  let csv: string | undefined;
  for (const candidate of candidates) {
    try {
      csv = await readFile(candidate, "utf8");
      break;
    } catch (error: unknown) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    }
  }
  if (!csv) throw new Error(`Required WOS Tools seed export was not found: ${WOS_TOOLS_SEED_FILE}`);
  const result = parseProfileCsv(csv, WOS_TOOLS_SEED_FILE);
  if (result.errors.length > 0 || Object.keys(result.profileExport.values).length === 0) {
    throw new Error(`Required WOS Tools seed export is invalid: ${result.errors.join(" ")}`);
  }
  return result.profileExport;
}

async function getOrCreateProfile() {
  let profile = await getSingletonProfile();
  if (profile && Object.keys(asProfileExport(profile.exportData).values).length > 0) return profile;

  const exportData = await loadSeedProfileExport();
  if (!profile) {
    [profile] = await db.insert(profileTable).values({ exportData }).returning();
  } else {
    [profile] = await db.update(profileTable)
      .set({ exportData, updatedAt: new Date() })
      .where(eq(profileTable.id, profile.id))
      .returning();
  }
  return profile;
}

function serializeProfile(p: typeof profileTable.$inferSelect) {
  return {
    id: p.id,
    buildings: p.buildings,
    research: p.research,
    chiefGear: p.chiefGear,
    chiefCharms: p.chiefCharms,
    heroGear: p.heroGear,
    heroes: p.heroes,
    pets: p.pets,
    experts: p.experts,
    bonuses: p.bonuses,
    exportData: asProfileExport(p.exportData),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const profile = await getOrCreateProfile();
  res.json(serializeProfile(profile));
});

router.get("/export", async (_req, res): Promise<void> => {
  const profile = await getOrCreateProfile();
  res.json(GetProfileExportResponse.parse(asProfileExport(profile.exportData)));
});

router.post("/import/preview", (req, res): void => {
  const input = PreviewProfileImportBody.safeParse(req.body);
  if (!input.success || input.data.csv.length > 2_000_000) {
    res.status(400).json({ error: "Provide a CSV export smaller than 2 MB." });
    return;
  }
  const result = parseProfileCsv(input.data.csv, input.data.sourceName);
  const importedRows = Object.keys(result.profileExport.values).length;
  res.json(PreviewProfileImportResponse.parse({
    importedRows,
    groupCounts: result.groupCounts,
    errors: result.errors,
    isValid: importedRows > 0 && result.errors.length === 0,
  }));
});

router.post("/import", async (req, res): Promise<void> => {
  const input = ImportProfileExportBody.safeParse(req.body);
  if (!input.success || input.data.csv.length > 2_000_000) {
    res.status(400).json({ error: "Provide a CSV export smaller than 2 MB." });
    return;
  }
  const result = parseProfileCsv(input.data.csv, input.data.sourceName);
  if (result.errors.length > 0 || Object.keys(result.profileExport.values).length === 0) {
    res.status(400).json({ error: "The CSV could not be imported.", errors: result.errors });
    return;
  }

  let profile = await getSingletonProfile();
  if (!profile) {
    [profile] = await db.insert(profileTable).values({ exportData: result.profileExport }).returning();
  } else {
    [profile] = await db.update(profileTable)
      .set({ exportData: result.profileExport, updatedAt: new Date() })
      .where(and(
        eq(profileTable.id, profile.id),
        sql`${profileTable.exportData}->>'importedAt' = ${input.data.expectedImportedAt}`,
      ))
      .returning();
    if (!profile) {
      res.status(409).json({ error: "Your profile changed while this file was being prepared. Refresh and preview the import again." });
      return;
    }
  }
  res.json(ImportProfileExportResponse.parse(asProfileExport(profile.exportData)));
});

router.patch("/export/field", async (req, res): Promise<void> => {
  const input = UpdateProfileExportFieldBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Provide a valid field name and a string, number, or boolean value." });
    return;
  }
  const { field, value } = input.data;
  if (
    !isValidExportField(field) ||
    !["string", "number", "boolean"].includes(typeof value)
  ) {
    res.status(400).json({ error: "Provide a valid field name and a string, number, or boolean value." });
    return;
  }

  const profile = await getOrCreateProfile();
  const current = asProfileExport(profile.exportData);
  if (current.importedAt !== input.data.expectedImportedAt) {
    res.status(409).json({ error: "This field was changed elsewhere. Refresh before editing it again." });
    return;
  }
  const exportData: ProfileExport = {
    ...current,
    values: { ...current.values, [field]: value as ProfileValue },
    importedAt: new Date().toISOString(),
  };
  const [updated] = await db.update(profileTable)
    .set({ exportData, updatedAt: new Date() })
    .where(and(
      eq(profileTable.id, profile.id),
      sql`${profileTable.exportData}->>'importedAt' = ${input.data.expectedImportedAt}`,
    ))
    .returning();
  if (!updated) {
    res.status(409).json({ error: "This field was changed elsewhere. Refresh before editing it again." });
    return;
  }
  res.json(UpdateProfileExportFieldResponse.parse(asProfileExport(updated.exportData)));
});

router.patch("/:section", async (req, res) => {
  const { section } = req.params;
  const patch = req.body;

  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    res.status(400).json({ error: "Body must be a JSON object" });
    return;
  }

  let profile = await getSingletonProfile();
  if (!profile) {
    [profile] = await db.insert(profileTable).values({}).returning();
  }

  // Merge semantics: spread existing section data with the incoming patch
  let updateValues: Partial<typeof profileTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  const existing = profile as Record<string, unknown>;

  switch (section) {
    case "buildings":
      updateValues.buildings = { ...(existing.buildings as object ?? {}), ...patch };
      break;
    case "research":
      updateValues.research = { ...(existing.research as object ?? {}), ...patch };
      break;
    case "chief-gear":
      updateValues.chiefGear = { ...(existing.chiefGear as object ?? {}), ...patch };
      break;
    case "chief-charms":
      updateValues.chiefCharms = { ...(existing.chiefCharms as object ?? {}), ...patch };
      break;
    case "hero-gear":
      updateValues.heroGear = { ...(existing.heroGear as object ?? {}), ...patch };
      break;
    case "heroes":
      updateValues.heroes = { ...(existing.heroes as object ?? {}), ...patch };
      break;
    case "pets":
      updateValues.pets = { ...(existing.pets as object ?? {}), ...patch };
      break;
    case "experts":
      updateValues.experts = { ...(existing.experts as object ?? {}), ...patch };
      break;
    case "bonuses":
      updateValues.bonuses = { ...(existing.bonuses as object ?? {}), ...patch };
      break;
    default:
      res.status(400).json({ error: `Unknown section: ${section}` });
      return;
  }

  const [updated] = await db
    .update(profileTable)
    .set(updateValues)
    .where(eq(profileTable.id, profile.id))
    .returning();

  res.json(serializeProfile(updated));
});

export default router;
