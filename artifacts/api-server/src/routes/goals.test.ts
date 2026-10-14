import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
vi.mock("../middlewares/ownerAuth", () => ({
  requireOwner: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import request from "supertest";
import app from "../app";
import { db, goalsTable, goalItemsTable, itemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let goalId: number;
let itemAId: number;
let itemBId: number;

beforeEach(async () => {
  const [goal] = await db
    .insert(goalsTable)
    .values({ name: "Pct Test Goal", category: "test", multiplier: 1 })
    .returning();
  goalId = goal.id;

  const [itemA] = await db
    .insert(itemsTable)
    .values({ name: "Pct Item A", category: "test", currentAmount: 0 })
    .returning();
  itemAId = itemA.id;

  const [itemB] = await db
    .insert(itemsTable)
    .values({ name: "Pct Item B", category: "test", currentAmount: 0 })
    .returning();
  itemBId = itemB.id;
});

afterEach(async () => {
  await db.delete(goalItemsTable).where(eq(goalItemsTable.goalId, goalId));
  await db.delete(goalsTable).where(eq(goalsTable.id, goalId));
  await db.delete(itemsTable).where(eq(itemsTable.id, itemAId));
  await db.delete(itemsTable).where(eq(itemsTable.id, itemBId));
});

describe("GET /api/goals — completionPct with multiplier", () => {
  it("reports 0% when no items are achieved (multiplier = 1)", async () => {
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal).toBeDefined();
    expect(goal.completionPct).toBe(0);
  });

  it("reports 100% when all items are achieved (multiplier = 1)", async () => {
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemAId));
    await db.update(itemsTable).set({ currentAmount: 50 }).where(eq(itemsTable.id, itemBId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal.completionPct).toBe(100);
  });

  it("reports partial % when only some items are achieved (multiplier = 1)", async () => {
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemAId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal.completionPct).toBe(50);
  });

  it("reports 0% when multiplier > 1 and stock meets base requirement but not scaled one", async () => {
    await db.update(goalsTable).set({ multiplier: 3 }).where(eq(goalsTable.id, goalId));
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemAId));
    await db.update(itemsTable).set({ currentAmount: 50 }).where(eq(itemsTable.id, itemBId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal.completionPct).toBe(0);
    expect(goal.multiplier).toBe(3);
  });

  it("reports partial completionPct < 100 when multiplier > 1 and only one item meets scaled requirement", async () => {
    await db.update(goalsTable).set({ multiplier: 2 }).where(eq(goalsTable.id, goalId));
    await db.update(itemsTable).set({ currentAmount: 200 }).where(eq(itemsTable.id, itemAId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 100,
    });

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal.completionPct).toBe(50);
    expect(goal.completionPct).toBeLessThan(100);
  });

  it("reports 100% when multiplier > 1 and all items meet the scaled requirement", async () => {
    await db.update(goalsTable).set({ multiplier: 2 }).where(eq(goalsTable.id, goalId));
    await db.update(itemsTable).set({ currentAmount: 200 }).where(eq(itemsTable.id, itemAId));
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemBId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal.completionPct).toBe(100);
  });

  it("changes completionPct when multiplier is updated on an existing goal via PUT /api/goals/:id", async () => {
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemAId));
    await db.update(itemsTable).set({ currentAmount: 50 }).where(eq(itemsTable.id, itemBId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const beforeRes = await request(app).get("/api/goals");
    const goalBefore = beforeRes.body.find((g: { id: number }) => g.id === goalId);
    expect(goalBefore.completionPct).toBe(100);

    const putRes = await request(app)
      .put(`/api/goals/${goalId}`)
      .send({ multiplier: 2 });
    expect(putRes.status).toBe(200);
    expect(putRes.body.completionPct).toBe(0);

    const afterRes = await request(app).get("/api/goals");
    const goalAfter = afterRes.body.find((g: { id: number }) => g.id === goalId);
    expect(goalAfter.completionPct).toBe(0);
    expect(goalAfter.multiplier).toBe(2);
  });
});

describe("GET /api/goals — completionPct rounds correctly for non-integer percentages", () => {
  let itemCId: number;
  let itemDId: number;
  let itemEId: number;
  let itemFId: number;
  let itemGId: number;

  beforeEach(async () => {
    const [itemC] = await db
      .insert(itemsTable)
      .values({ name: "Pct Item C", category: "test", currentAmount: 0 })
      .returning();
    itemCId = itemC.id;

    const [itemD] = await db
      .insert(itemsTable)
      .values({ name: "Pct Item D", category: "test", currentAmount: 0 })
      .returning();
    itemDId = itemD.id;

    const [itemE] = await db
      .insert(itemsTable)
      .values({ name: "Pct Item E", category: "test", currentAmount: 0 })
      .returning();
    itemEId = itemE.id;

    const [itemF] = await db
      .insert(itemsTable)
      .values({ name: "Pct Item F", category: "test", currentAmount: 0 })
      .returning();
    itemFId = itemF.id;

    const [itemG] = await db
      .insert(itemsTable)
      .values({ name: "Pct Item G", category: "test", currentAmount: 0 })
      .returning();
    itemGId = itemG.id;
  });

  afterEach(async () => {
    await db.delete(itemsTable).where(eq(itemsTable.id, itemCId));
    await db.delete(itemsTable).where(eq(itemsTable.id, itemDId));
    await db.delete(itemsTable).where(eq(itemsTable.id, itemEId));
    await db.delete(itemsTable).where(eq(itemsTable.id, itemFId));
    await db.delete(itemsTable).where(eq(itemsTable.id, itemGId));
  });

  it("rounds 1/3 achieved to 33 (not 34)", async () => {
    await db.update(itemsTable).set({ currentAmount: 10 }).where(eq(itemsTable.id, itemAId));

    await db.insert(goalItemsTable).values([
      { goalId, itemId: itemAId, itemName: "Pct Item A", requiredAmount: 10 },
      { goalId, itemId: itemBId, itemName: "Pct Item B", requiredAmount: 10 },
      { goalId, itemId: itemCId, itemName: "Pct Item C", requiredAmount: 10 },
    ]);

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal).toBeDefined();
    expect(goal.completionPct).toBe(33);
  });

  it("rounds 2/3 achieved to 67 (not 66)", async () => {
    await db.update(itemsTable).set({ currentAmount: 10 }).where(eq(itemsTable.id, itemAId));
    await db.update(itemsTable).set({ currentAmount: 10 }).where(eq(itemsTable.id, itemBId));

    await db.insert(goalItemsTable).values([
      { goalId, itemId: itemAId, itemName: "Pct Item A", requiredAmount: 10 },
      { goalId, itemId: itemBId, itemName: "Pct Item B", requiredAmount: 10 },
      { goalId, itemId: itemCId, itemName: "Pct Item C", requiredAmount: 10 },
    ]);

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal).toBeDefined();
    expect(goal.completionPct).toBe(67);
  });

  it("rounds 1/7 achieved to 14 (not 15)", async () => {
    await db.update(itemsTable).set({ currentAmount: 10 }).where(eq(itemsTable.id, itemAId));

    await db.insert(goalItemsTable).values([
      { goalId, itemId: itemAId, itemName: "Pct Item A", requiredAmount: 10 },
      { goalId, itemId: itemBId, itemName: "Pct Item B", requiredAmount: 10 },
      { goalId, itemId: itemCId, itemName: "Pct Item C", requiredAmount: 10 },
      { goalId, itemId: itemDId, itemName: "Pct Item D", requiredAmount: 10 },
      { goalId, itemId: itemEId, itemName: "Pct Item E", requiredAmount: 10 },
      { goalId, itemId: itemFId, itemName: "Pct Item F", requiredAmount: 10 },
      { goalId, itemId: itemGId, itemName: "Pct Item G", requiredAmount: 10 },
    ]);

    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    const goal = res.body.find((g: { id: number }) => g.id === goalId);
    expect(goal).toBeDefined();
    expect(goal.completionPct).toBe(14);
  });
});

describe("GET /api/goals/:id — completionPct matches list endpoint", () => {
  it("returns 404 for a non-existent goal", async () => {
    const res = await request(app).get("/api/goals/999999999");
    expect(res.status).toBe(404);
  });

  it("matches list endpoint: 0% when no items achieved (multiplier = 1)", async () => {
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const listRes = await request(app).get("/api/goals");
    expect(listRes.status).toBe(200);
    const fromList = listRes.body.find((g: { id: number }) => g.id === goalId);

    const singleRes = await request(app).get(`/api/goals/${goalId}`);
    expect(singleRes.status).toBe(200);

    expect(singleRes.body.completionPct).toBe(0);
    expect(singleRes.body.completionPct).toBe(fromList.completionPct);
  });

  it("matches list endpoint: 100% when all items achieved (multiplier = 1)", async () => {
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemAId));
    await db.update(itemsTable).set({ currentAmount: 50 }).where(eq(itemsTable.id, itemBId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const listRes = await request(app).get("/api/goals");
    const fromList = listRes.body.find((g: { id: number }) => g.id === goalId);

    const singleRes = await request(app).get(`/api/goals/${goalId}`);
    expect(singleRes.status).toBe(200);

    expect(singleRes.body.completionPct).toBe(100);
    expect(singleRes.body.completionPct).toBe(fromList.completionPct);
  });

  it("matches list endpoint: partial % when only one of two items achieved (multiplier = 1)", async () => {
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemAId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const listRes = await request(app).get("/api/goals");
    const fromList = listRes.body.find((g: { id: number }) => g.id === goalId);

    const singleRes = await request(app).get(`/api/goals/${goalId}`);
    expect(singleRes.status).toBe(200);

    expect(singleRes.body.completionPct).toBe(50);
    expect(singleRes.body.completionPct).toBe(fromList.completionPct);
  });

  it("matches list endpoint: 0% when multiplier > 1 and stock meets base but not scaled requirement", async () => {
    await db.update(goalsTable).set({ multiplier: 3 }).where(eq(goalsTable.id, goalId));
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemAId));
    await db.update(itemsTable).set({ currentAmount: 50 }).where(eq(itemsTable.id, itemBId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const listRes = await request(app).get("/api/goals");
    const fromList = listRes.body.find((g: { id: number }) => g.id === goalId);

    const singleRes = await request(app).get(`/api/goals/${goalId}`);
    expect(singleRes.status).toBe(200);

    expect(singleRes.body.completionPct).toBe(0);
    expect(singleRes.body.multiplier).toBe(3);
    expect(singleRes.body.completionPct).toBe(fromList.completionPct);
  });

  it("matches list endpoint: partial % when multiplier > 1 and only one item meets scaled requirement", async () => {
    await db.update(goalsTable).set({ multiplier: 2 }).where(eq(goalsTable.id, goalId));
    await db.update(itemsTable).set({ currentAmount: 200 }).where(eq(itemsTable.id, itemAId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 100,
    });

    const listRes = await request(app).get("/api/goals");
    const fromList = listRes.body.find((g: { id: number }) => g.id === goalId);

    const singleRes = await request(app).get(`/api/goals/${goalId}`);
    expect(singleRes.status).toBe(200);

    expect(singleRes.body.completionPct).toBe(50);
    expect(singleRes.body.completionPct).toBeLessThan(100);
    expect(singleRes.body.completionPct).toBe(fromList.completionPct);
  });

  it("matches list endpoint: 100% when multiplier > 1 and all items meet scaled requirement", async () => {
    await db.update(goalsTable).set({ multiplier: 2 }).where(eq(goalsTable.id, goalId));
    await db.update(itemsTable).set({ currentAmount: 200 }).where(eq(itemsTable.id, itemAId));
    await db.update(itemsTable).set({ currentAmount: 100 }).where(eq(itemsTable.id, itemBId));

    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemAId,
      itemName: "Pct Item A",
      requiredAmount: 100,
    });
    await db.insert(goalItemsTable).values({
      goalId,
      itemId: itemBId,
      itemName: "Pct Item B",
      requiredAmount: 50,
    });

    const listRes = await request(app).get("/api/goals");
    const fromList = listRes.body.find((g: { id: number }) => g.id === goalId);

    const singleRes = await request(app).get(`/api/goals/${goalId}`);
    expect(singleRes.status).toBe(200);

    expect(singleRes.body.completionPct).toBe(100);
    expect(singleRes.body.completionPct).toBe(fromList.completionPct);
  });
});
