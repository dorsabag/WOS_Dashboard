import { Router } from "express";
import { db, goalsTable, goalItemsTable, goalCompletionsTable, itemsTable } from "@workspace/db";
import { eq, asc, ilike, desc, and, inArray } from "drizzle-orm";
import {
  CreateGoalBody,
  UpdateGoalBody,
  UpdateGoalParams,
  DeleteGoalParams,
} from "@workspace/api-zod";

const router = Router();

async function buildGoalResponse(goal: typeof goalsTable.$inferSelect) {
  const multiplier = goal.multiplier ?? 1;

  const goalItems = await db.select().from(goalItemsTable)
    .where(eq(goalItemsTable.goalId, goal.id))
    .orderBy(asc(goalItemsTable.id));

  const itemIds = goalItems.map((gi) => gi.itemId).filter(Boolean) as number[];
  const itemsMap = new Map<number, number>();
  if (itemIds.length > 0) {
    for (const id of itemIds) {
      const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, id)).limit(1);
      if (item) itemsMap.set(item.id, item.currentAmount);
    }
  }

  const enrichedItems = goalItems.map((gi) => {
    const currentAmount = gi.itemId ? (itemsMap.get(gi.itemId) ?? 0) : 0;
    const effectiveRequired = gi.requiredAmount * multiplier;
    const remaining = Math.max(0, effectiveRequired - currentAmount);
    return {
      id: gi.id,
      goalId: gi.goalId,
      itemId: gi.itemId,
      itemName: gi.itemName,
      requiredAmount: gi.requiredAmount,
      currentAmount,
      remaining,
      isAchieved: currentAmount >= effectiveRequired,
    };
  });

  const totalItems = enrichedItems.length;
  const achievedItems = enrichedItems.filter((i) => i.isAchieved).length;
  const completionPct = totalItems > 0 ? Math.round((achievedItems / totalItems) * 100) : 0;

  let lastCompletion: { completedAt: string; itemsConsumed: { itemName: string; amountConsumed: number }[] } | null = null;
  if (goal.isCompleted) {
    const [completion] = await db.select().from(goalCompletionsTable)
      .where(and(eq(goalCompletionsTable.goalId, goal.id), eq(goalCompletionsTable.action, "complete")))
      .orderBy(desc(goalCompletionsTable.completedAt))
      .limit(1);
    if (completion) {
      lastCompletion = {
        completedAt: completion.completedAt.toISOString(),
        itemsConsumed: completion.itemsConsumed,
      };
    }
  }

  return {
    id: goal.id,
    name: goal.name,
    category: goal.category,
    description: goal.description,
    isCompleted: goal.isCompleted,
    multiplier: goal.multiplier,
    deadlineEventId: goal.deadlineEventId ?? null,
    iconUrl1: goal.iconUrl1 ?? null,
    iconUrl2: goal.iconUrl2 ?? null,
    completionPct,
    goalItems: enrichedItems,
    createdAt: goal.createdAt.toISOString(),
    lastCompletion,
  };
}

router.get("/", async (_req, res) => {
  const goals = await db.select().from(goalsTable).orderBy(asc(goalsTable.category), asc(goalsTable.name));
  if (goals.length === 0) { res.json([]); return; }

  const goalIds = goals.map(g => g.id);

  const [allGoalItems, allCompletions] = await Promise.all([
    db.select().from(goalItemsTable).where(inArray(goalItemsTable.goalId, goalIds)).orderBy(asc(goalItemsTable.id)),
    db.select().from(goalCompletionsTable)
      .where(and(inArray(goalCompletionsTable.goalId, goalIds), eq(goalCompletionsTable.action, "complete")))
      .orderBy(desc(goalCompletionsTable.completedAt)),
  ]);

  const itemIds = [...new Set(allGoalItems.map(gi => gi.itemId).filter((id): id is number => id != null))];
  const itemAmountMap = new Map<number, number>();
  if (itemIds.length > 0) {
    const fetchedItems = await db.select({ id: itemsTable.id, currentAmount: itemsTable.currentAmount })
      .from(itemsTable).where(inArray(itemsTable.id, itemIds));
    for (const item of fetchedItems) itemAmountMap.set(item.id, item.currentAmount);
  }

  const goalItemsByGoalId = new Map<number, typeof allGoalItems>();
  for (const gi of allGoalItems) {
    if (!goalItemsByGoalId.has(gi.goalId)) goalItemsByGoalId.set(gi.goalId, []);
    goalItemsByGoalId.get(gi.goalId)!.push(gi);
  }

  const lastCompletionByGoalId = new Map<number, typeof allCompletions[0]>();
  for (const c of allCompletions) {
    if (!lastCompletionByGoalId.has(c.goalId)) lastCompletionByGoalId.set(c.goalId, c);
  }

  const result = goals.map(goal => {
    const multiplier = goal.multiplier ?? 1;
    const goalItems = goalItemsByGoalId.get(goal.id) ?? [];
    const enrichedItems = goalItems.map(gi => {
      const currentAmount = gi.itemId ? (itemAmountMap.get(gi.itemId) ?? 0) : 0;
      const effectiveRequired = gi.requiredAmount * multiplier;
      const remaining = Math.max(0, effectiveRequired - currentAmount);
      return { id: gi.id, goalId: gi.goalId, itemId: gi.itemId, itemName: gi.itemName, requiredAmount: gi.requiredAmount, currentAmount, remaining, isAchieved: currentAmount >= effectiveRequired };
    });
    const totalItems = enrichedItems.length;
    const achievedItems = enrichedItems.filter(i => i.isAchieved).length;
    const completionPct = totalItems > 0 ? Math.round((achievedItems / totalItems) * 100) : 0;
    const completion = lastCompletionByGoalId.get(goal.id);
    const lastCompletion = completion ? { completedAt: completion.completedAt.toISOString(), itemsConsumed: completion.itemsConsumed } : null;
    return {
      id: goal.id, name: goal.name, category: goal.category, description: goal.description,
      isCompleted: goal.isCompleted, multiplier: goal.multiplier, deadlineEventId: goal.deadlineEventId ?? null,
      iconUrl1: goal.iconUrl1 ?? null, iconUrl2: goal.iconUrl2 ?? null,
      completionPct, goalItems: enrichedItems, createdAt: goal.createdAt.toISOString(), lastCompletion,
    };
  });

  res.json(result);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  res.json(await buildGoalResponse(goal));
});

router.post("/", async (req, res) => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [goal] = await db.insert(goalsTable).values({
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description,
    multiplier: parsed.data.multiplier ?? 1,
    iconUrl1: parsed.data.iconUrl1 ?? null,
    iconUrl2: parsed.data.iconUrl2 ?? null,
  }).returning();
  res.status(201).json(await buildGoalResponse(goal));
});

router.put("/:id", async (req, res) => {
  const params = UpdateGoalParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateGoalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [goal] = await db.update(goalsTable)
    .set({
      ...(d.name !== undefined && { name: d.name }),
      ...(d.category !== undefined && { category: d.category }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.isCompleted !== undefined && { isCompleted: d.isCompleted }),
      ...(d.multiplier !== undefined && { multiplier: d.multiplier }),
      ...("deadlineEventId" in d && { deadlineEventId: d.deadlineEventId ?? null }),
      ...("iconUrl1" in d && { iconUrl1: d.iconUrl1 ?? null }),
      ...("iconUrl2" in d && { iconUrl2: d.iconUrl2 ?? null }),
    })
    .where(eq(goalsTable.id, params.data.id))
    .returning();
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  res.json(await buildGoalResponse(goal));
});

router.post("/:id/complete", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const updated = await db.transaction(async (tx) => {
      const [goal] = await tx.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);
      if (!goal) throw Object.assign(new Error("not_found"), { code: "not_found" });
      const multiplier = goal.multiplier ?? 1;
      const goalItems = await tx.select().from(goalItemsTable).where(eq(goalItemsTable.goalId, id));
      const itemsConsumed: { itemName: string; amountConsumed: number }[] = [];
      for (const gi of goalItems) {
        let itemId = gi.itemId ?? null;
        if (!itemId) {
          const [matched] = await tx.select().from(itemsTable).where(ilike(itemsTable.name, gi.itemName)).limit(1);
          if (matched) itemId = matched.id;
        }
        if (!itemId) continue;
        const [item] = await tx.select().from(itemsTable).where(eq(itemsTable.id, itemId)).limit(1);
        if (!item) continue;
        const deduct = gi.requiredAmount * multiplier;
        const newAmount = Math.max(0, item.currentAmount - deduct);
        const actualDeducted = item.currentAmount - newAmount;
        await tx.update(itemsTable).set({ currentAmount: newAmount, updatedAt: new Date() }).where(eq(itemsTable.id, itemId));
        itemsConsumed.push({ itemName: gi.itemName, amountConsumed: actualDeducted });
      }
      const [updated] = await tx.update(goalsTable).set({ isCompleted: true }).where(eq(goalsTable.id, id)).returning();
      await tx.insert(goalCompletionsTable).values({ goalId: id, action: "complete", itemsConsumed });
      return updated;
    });
    res.json(await buildGoalResponse(updated));
  } catch (err: any) {
    if (err.code === "not_found") { res.status(404).json({ error: "Goal not found" }); return; }
    console.error("completeGoal error:", err);
    res.status(500).json({ error: "Failed to complete goal" });
  }
});

router.post("/:id/uncomplete", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const updated = await db.transaction(async (tx) => {
      const [goal] = await tx.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);
      if (!goal) throw Object.assign(new Error("not_found"), { code: "not_found" });
      const multiplier = goal.multiplier ?? 1;
      const goalItems = await tx.select().from(goalItemsTable).where(eq(goalItemsTable.goalId, id));
      for (const gi of goalItems) {
        let itemId = gi.itemId ?? null;
        if (!itemId) {
          const [matched] = await tx.select().from(itemsTable).where(ilike(itemsTable.name, gi.itemName)).limit(1);
          if (matched) itemId = matched.id;
        }
        if (!itemId) continue;
        const [item] = await tx.select().from(itemsTable).where(eq(itemsTable.id, itemId)).limit(1);
        if (!item) continue;
        const restore = gi.requiredAmount * multiplier;
        const newAmount = item.currentAmount + restore;
        await tx.update(itemsTable).set({ currentAmount: newAmount, updatedAt: new Date() }).where(eq(itemsTable.id, itemId));
      }
      const [updated] = await tx.update(goalsTable).set({ isCompleted: false }).where(eq(goalsTable.id, id)).returning();
      const restoredItems = goalItems
        .map(gi => ({ itemName: gi.itemName, amountConsumed: gi.requiredAmount * multiplier }));
      await tx.insert(goalCompletionsTable).values({ goalId: id, action: "uncomplete", itemsConsumed: restoredItems });
      return updated;
    });
    res.json(await buildGoalResponse(updated));
  } catch (err: any) {
    if (err.code === "not_found") { res.status(404).json({ error: "Goal not found" }); return; }
    console.error("uncompleteGoal error:", err);
    res.status(500).json({ error: "Failed to uncomplete goal" });
  }
});

router.delete("/:id", async (req, res) => {
  const params = DeleteGoalParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(goalsTable).where(eq(goalsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
