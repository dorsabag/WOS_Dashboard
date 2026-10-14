import { Router } from "express";
import { db, troopsTable, marchesTable, itemsTable, goalsTable, goalItemsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

const router = Router();

router.get("/summary", async (_req, res) => {
  const [troops] = await db.select().from(troopsTable).limit(1);
  const totalItems = (await db.select({ count: sql<number>`count(*)::int` }).from(itemsTable))[0]?.count ?? 0;
  const totalGoals = (await db.select({ count: sql<number>`count(*)::int` }).from(goalsTable))[0]?.count ?? 0;
  const completedGoals = (await db.select({ count: sql<number>`count(*)::int` }).from(goalsTable).where(eq(goalsTable.isCompleted, true)))[0]?.count ?? 0;
  const marchesConfigured = (await db.select({ count: sql<number>`count(*)::int` }).from(marchesTable).where(sql`capacity > 0`))[0]?.count ?? 0;

  const goalItems = await db.select().from(goalItemsTable);
  const totalGoalItems = goalItems.length;
  const linkedItemIds = [...new Set(goalItems.filter(gi => gi.itemId).map(gi => gi.itemId!))];
  const linkedItems = linkedItemIds.length > 0
    ? await db.select({ id: itemsTable.id, currentAmount: itemsTable.currentAmount }).from(itemsTable).where(inArray(itemsTable.id, linkedItemIds))
    : [];
  const itemAmountMap = new Map(linkedItems.map(it => [it.id, it.currentAmount]));
  let achievedGoalItems = 0;
  for (const gi of goalItems) {
    if (gi.itemId && (itemAmountMap.get(gi.itemId) ?? 0) >= gi.requiredAmount) achievedGoalItems++;
  }
  const overallGoalProgress = totalGoalItems > 0
    ? Math.round((achievedGoalItems / totalGoalItems) * 100)
    : 0;

  res.json({
    totalTroops: troops ? troops.infantry + troops.lancer + troops.marksman : 0,
    deploymentCapacity: troops?.deploymentCapacity ?? 0,
    deploymentWithCyrille: troops ? troops.deploymentCapacity + troops.cyrilleBonus : 0,
    rallyCapacity: troops?.rallyCapacity ?? 0,
    totalItems,
    totalGoals,
    completedGoals,
    overallGoalProgress,
    marchesConfigured,
  });
});

export default router;
