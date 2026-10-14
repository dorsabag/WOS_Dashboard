import { Router } from "express";
import { db, marchesTable, troopsTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { UpdateMarchBody, UpdateMarchParams } from "@workspace/api-zod";

const router = Router();

async function ensureMarches() {
  const existing = await db.select().from(marchesTable).orderBy(asc(marchesTable.marchNumber));
  if (existing.length === 7) return existing;
  const defaults = [
    { marchNumber: 1, label: "Own Rally", capacity: 0 },
    { marchNumber: 2, label: "Joiner March 1", capacity: 0 },
    { marchNumber: 3, label: "Joiner March 2", capacity: 0 },
    { marchNumber: 4, label: "Joiner March 3", capacity: 0 },
    { marchNumber: 5, label: "Joiner March 4", capacity: 0 },
    { marchNumber: 6, label: "Joiner March 5", capacity: 0 },
    { marchNumber: 7, label: "Joiner March 6", capacity: 0 },
  ];
  const existingNums = new Set(existing.map((m) => m.marchNumber));
  for (const d of defaults) {
    if (!existingNums.has(d.marchNumber)) {
      await db.insert(marchesTable).values(d);
    }
  }
  return db.select().from(marchesTable).orderBy(asc(marchesTable.marchNumber));
}

router.get("/", async (_req, res) => {
  const marches = await ensureMarches();
  res.json(marches.map((m) => ({
    id: m.id,
    marchNumber: m.marchNumber,
    label: m.label,
    infantry: m.infantry,
    lancer: m.lancer,
    marksman: m.marksman,
    capacity: m.capacity,
    notes: m.notes,
    icon0: m.icon0 ?? null,
    icon1: m.icon1 ?? null,
    icon2: m.icon2 ?? null,
  })));
});

router.get("/remaining", async (_req, res) => {
  const marches = await ensureMarches();
  const [troops] = await db.select().from(troopsTable).orderBy(asc(troopsTable.id)).limit(1);
  const infantryTotal = (troops?.infantry ?? 0) + (troops?.heliosInfantry ?? 0);
  const lancerTotal = (troops?.lancer ?? 0) + (troops?.heliosLancer ?? 0);
  const marksmanTotal = (troops?.marksman ?? 0) + (troops?.heliosMarksman ?? 0);
  const infantryUsed = marches.reduce((s, m) => s + m.infantry, 0);
  const lancerUsed = marches.reduce((s, m) => s + m.lancer, 0);
  const marksmanUsed = marches.reduce((s, m) => s + m.marksman, 0);
  res.json({
    infantryUsed,
    lancerUsed,
    marksmanUsed,
    infantryRemaining: infantryTotal - infantryUsed,
    lancerRemaining: lancerTotal - lancerUsed,
    marksmanRemaining: marksmanTotal - marksmanUsed,
    totalUsed: infantryUsed + lancerUsed + marksmanUsed,
    totalRemaining: (infantryTotal + lancerTotal + marksmanTotal) - (infantryUsed + lancerUsed + marksmanUsed),
  });
});

router.put("/:id", async (req, res) => {
  const params = UpdateMarchParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateMarchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const data = parsed.data;
  const [march] = await db.update(marchesTable)
    .set({
      ...(data.label !== undefined && { label: data.label }),
      ...(data.infantry !== undefined && { infantry: data.infantry }),
      ...(data.lancer !== undefined && { lancer: data.lancer }),
      ...(data.marksman !== undefined && { marksman: data.marksman }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.icon0 !== undefined && { icon0: data.icon0 }),
      ...(data.icon1 !== undefined && { icon1: data.icon1 }),
      ...(data.icon2 !== undefined && { icon2: data.icon2 }),
      updatedAt: new Date(),
    })
    .where(eq(marchesTable.id, params.data.id))
    .returning();
  if (!march) { res.status(404).json({ error: "March not found" }); return; }
  res.json({
    id: march.id,
    marchNumber: march.marchNumber,
    label: march.label,
    infantry: march.infantry,
    lancer: march.lancer,
    marksman: march.marksman,
    capacity: march.capacity,
    notes: march.notes,
    icon0: march.icon0 ?? null,
    icon1: march.icon1 ?? null,
    icon2: march.icon2 ?? null,
  });
});

export default router;
