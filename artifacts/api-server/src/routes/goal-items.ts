import { Router } from "express";
import { db, goalItemsTable, itemsTable, goalsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateGoalItemBody,
  UpdateGoalItemBody,
  UpdateGoalItemParams,
  DeleteGoalItemParams,
} from "@workspace/api-zod";

const router = Router();

async function resolveItemId(itemName: string, providedId?: number): Promise<number | null> {
  if (providedId) return providedId;
  const [match] = await db.select({ id: itemsTable.id })
    .from(itemsTable)
    .where(sql`lower(${itemsTable.name}) = lower(${itemName})`)
    .limit(1);
  return match?.id ?? null;
}

router.post("/", async (req, res) => {
  const parsed = CreateGoalItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;

  const resolvedItemId = await resolveItemId(d.itemName, d.itemId);

  const [gi] = await db.insert(goalItemsTable).values({
    goalId: d.goalId,
    itemId: resolvedItemId,
    itemName: d.itemName,
    requiredAmount: d.requiredAmount,
  }).returning();

  const [parentGoal] = await db.select({ multiplier: goalsTable.multiplier })
    .from(goalsTable)
    .where(eq(goalsTable.id, gi.goalId))
    .limit(1);
  const multiplier = parentGoal?.multiplier ?? 1;

  const currentAmount = gi.itemId
    ? (await db.select().from(itemsTable).where(eq(itemsTable.id, gi.itemId)).limit(1))[0]?.currentAmount ?? 0
    : 0;
  const effectiveRequired = gi.requiredAmount * multiplier;
  const remaining = Math.max(0, effectiveRequired - currentAmount);

  res.status(201).json({
    id: gi.id,
    goalId: gi.goalId,
    itemId: gi.itemId,
    itemName: gi.itemName,
    requiredAmount: gi.requiredAmount,
    currentAmount,
    remaining,
    isAchieved: currentAmount >= effectiveRequired,
  });
});

router.put("/:id", async (req, res) => {
  const params = UpdateGoalItemParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateGoalItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;

  const existing = (await db.select().from(goalItemsTable).where(eq(goalItemsTable.id, params.data.id)).limit(1))[0];
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const newItemName = d.itemName ?? existing.itemName;
  const resolvedItemId = d.itemName ? await resolveItemId(newItemName) : existing.itemId;

  const [gi] = await db.update(goalItemsTable)
    .set({
      ...(d.requiredAmount !== undefined && { requiredAmount: d.requiredAmount }),
      ...(d.itemName !== undefined && { itemName: d.itemName, itemId: resolvedItemId }),
    })
    .where(eq(goalItemsTable.id, params.data.id))
    .returning();
  if (!gi) { res.status(404).json({ error: "Not found" }); return; }

  const [parentGoal] = await db.select({ multiplier: goalsTable.multiplier })
    .from(goalsTable)
    .where(eq(goalsTable.id, gi.goalId))
    .limit(1);
  const multiplier = parentGoal?.multiplier ?? 1;

  const currentAmount = gi.itemId
    ? (await db.select().from(itemsTable).where(eq(itemsTable.id, gi.itemId)).limit(1))[0]?.currentAmount ?? 0
    : 0;
  const effectiveRequired = gi.requiredAmount * multiplier;
  const remaining = Math.max(0, effectiveRequired - currentAmount);

  res.json({
    id: gi.id,
    goalId: gi.goalId,
    itemId: gi.itemId,
    itemName: gi.itemName,
    requiredAmount: gi.requiredAmount,
    currentAmount,
    remaining,
    isAchieved: currentAmount >= effectiveRequired,
  });
});

router.delete("/:id", async (req, res) => {
  const params = DeleteGoalItemParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(goalItemsTable).where(eq(goalItemsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
