import { Router } from "express";
import { db, troopsTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import {
  UpdateTroopsBody,
} from "@workspace/api-zod";

const router = Router();

const CYRILLE_BONUS = 30_000;
const HERO_TROOPS_CAPACITY = 13_470;
const HERO_MULTIPLIER = 3;

// The app treats `troops` as a singleton table (exactly one row). Selects
// must always order deterministically by id, otherwise Postgres can return
// rows in different orders across queries, causing a GET and a subsequent
// PUT to silently operate on two different rows if duplicates ever exist.
async function getSingletonTroops() {
  const [troops] = await db.select().from(troopsTable).orderBy(asc(troopsTable.id)).limit(1);
  return troops;
}

function troopsRow(troops: NonNullable<Awaited<ReturnType<typeof getSingletonTroops>>>) {
  return {
    id: troops.id,
    infantry: troops.infantry,
    lancer: troops.lancer,
    marksman: troops.marksman,
    heliosInfantry: troops.heliosInfantry,
    heliosLancer: troops.heliosLancer,
    heliosMarksman: troops.heliosMarksman,
    deploymentCapacity: troops.deploymentCapacity,
    deploymentBonus: troops.deploymentBonus,
    cyrilleBonus: troops.cyrilleBonus,
    rallyCapacity: troops.rallyCapacity,
    rallyBonus: troops.rallyBonus,
    updatedAt: troops.updatedAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  let troops = await getSingletonTroops();
  if (!troops) {
    [troops] = await db.insert(troopsTable).values({}).returning();
  }
  res.json(troopsRow(troops));
});

router.put("/", async (req, res) => {
  const parsed = UpdateTroopsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = parsed.data;
  let existing = await getSingletonTroops();
  let troops;
  if (!existing) {
    [troops] = await db.insert(troopsTable).values({
      infantry: data.infantry ?? 0,
      lancer: data.lancer ?? 0,
      marksman: data.marksman ?? 0,
      heliosInfantry: data.heliosInfantry ?? 0,
      heliosLancer: data.heliosLancer ?? 0,
      heliosMarksman: data.heliosMarksman ?? 0,
      deploymentCapacity: data.deploymentCapacity ?? 0,
      deploymentBonus: data.deploymentBonus ?? 0,
      cyrilleBonus: data.cyrilleBonus ?? 0,
      rallyCapacity: data.rallyCapacity ?? 0,
      rallyBonus: data.rallyBonus ?? 0,
    }).returning();
  } else {
    [troops] = await db.update(troopsTable)
      .set({
        ...(data.infantry !== undefined && { infantry: data.infantry }),
        ...(data.lancer !== undefined && { lancer: data.lancer }),
        ...(data.marksman !== undefined && { marksman: data.marksman }),
        ...(data.heliosInfantry !== undefined && { heliosInfantry: data.heliosInfantry }),
        ...(data.heliosLancer !== undefined && { heliosLancer: data.heliosLancer }),
        ...(data.heliosMarksman !== undefined && { heliosMarksman: data.heliosMarksman }),
        ...(data.deploymentCapacity !== undefined && { deploymentCapacity: data.deploymentCapacity }),
        ...(data.deploymentBonus !== undefined && { deploymentBonus: data.deploymentBonus }),
        ...(data.cyrilleBonus !== undefined && { cyrilleBonus: data.cyrilleBonus }),
        ...(data.rallyCapacity !== undefined && { rallyCapacity: data.rallyCapacity }),
        ...(data.rallyBonus !== undefined && { rallyBonus: data.rallyBonus }),
        updatedAt: new Date(),
      })
      .where(eq(troopsTable.id, existing.id))
      .returning();
  }
  res.json(troopsRow(troops));
});

router.get("/summary", async (_req, res) => {
  let troops = await getSingletonTroops();
  if (!troops) {
    [troops] = await db.insert(troopsTable).values({}).returning();
  }
  const total = troops.infantry + troops.lancer + troops.marksman + troops.heliosInfantry + troops.heliosLancer + troops.heliosMarksman;
  const deployCapNoHeroes = troops.deploymentCapacity + troops.deploymentBonus;
  const totalDeploymentCap = deployCapNoHeroes + HERO_TROOPS_CAPACITY * HERO_MULTIPLIER;
  const totalRallyCap = troops.rallyCapacity + troops.rallyBonus + deployCapNoHeroes;
  const infantryTotal = troops.infantry + troops.heliosInfantry;
  const lancerTotal = troops.lancer + troops.heliosLancer;
  const marksmanTotal = troops.marksman + troops.heliosMarksman;
  res.json({
    infantry: infantryTotal,
    lancer: lancerTotal,
    marksman: marksmanTotal,
    total,
    deploymentCapacity: troops.deploymentCapacity,
    deploymentBonus: troops.deploymentBonus,
    deployCapNoHeroes,
    totalDeploymentCap,
    deploymentWithCyrille: deployCapNoHeroes + CYRILLE_BONUS,
    rallyCapacity: troops.rallyCapacity,
    rallyBonus: troops.rallyBonus,
    totalRallyCap,
    infantryPct: total > 0 ? Math.round((infantryTotal / total) * 100) : 0,
    lancerPct: total > 0 ? Math.round((lancerTotal / total) * 100) : 0,
    marksmanPct: total > 0 ? Math.round((marksmanTotal / total) * 100) : 0,
  });
});

export default router;
