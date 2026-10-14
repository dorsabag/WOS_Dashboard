import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
vi.mock("../middlewares/ownerAuth", () => ({
  requireOwner: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import request from "supertest";
import app from "../app";
import { db, goalsTable, goalItemsTable, itemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let goalId: number;
let itemId: number;

beforeEach(async () => {
  const [goal] = await db
    .insert(goalsTable)
    .values({ name: "Test Goal", category: "test", multiplier: 1 })
    .returning();
  goalId = goal.id;

  const [item] = await db
    .insert(itemsTable)
    .values({ name: "Test Item", category: "test", currentAmount: 0 })
    .returning();
  itemId = item.id;
});

afterEach(async () => {
  await db.delete(goalItemsTable).where(eq(goalItemsTable.goalId, goalId));
  await db.delete(goalsTable).where(eq(goalsTable.id, goalId));
  await db.delete(itemsTable).where(eq(itemsTable.id, itemId));
});

describe("POST /api/goal-items — multiplier accuracy", () => {
  it("returns correct remaining with default multiplier = 1", async () => {
    const res = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 100,
    });

    expect(res.status).toBe(201);
    expect(res.body.remaining).toBe(100);
    expect(res.body.isAchieved).toBe(false);
  });

  it("scales remaining by multiplier > 1", async () => {
    await db
      .update(goalsTable)
      .set({ multiplier: 3 })
      .where(eq(goalsTable.id, goalId));

    const res = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 50,
    });

    expect(res.status).toBe(201);
    expect(res.body.remaining).toBe(150);
    expect(res.body.isAchieved).toBe(false);
  });

  it("counts as achieved when currentAmount meets requiredAmount × multiplier", async () => {
    await db
      .update(goalsTable)
      .set({ multiplier: 2 })
      .where(eq(goalsTable.id, goalId));
    await db
      .update(itemsTable)
      .set({ currentAmount: 200 })
      .where(eq(itemsTable.id, itemId));

    const res = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 100,
    });

    expect(res.status).toBe(201);
    expect(res.body.remaining).toBe(0);
    expect(res.body.isAchieved).toBe(true);
  });

  it("remaining is 0 (not negative) when stock exceeds effective requirement", async () => {
    await db
      .update(goalsTable)
      .set({ multiplier: 2 })
      .where(eq(goalsTable.id, goalId));
    await db
      .update(itemsTable)
      .set({ currentAmount: 999 })
      .where(eq(itemsTable.id, itemId));

    const res = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 100,
    });

    expect(res.status).toBe(201);
    expect(res.body.remaining).toBe(0);
    expect(res.body.isAchieved).toBe(true);
  });

  it("remaining equals requiredAmount when multiplier = 0", async () => {
    await db
      .update(goalsTable)
      .set({ multiplier: 0 })
      .where(eq(goalsTable.id, goalId));

    const res = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 100,
    });

    expect(res.status).toBe(201);
    expect(res.body.remaining).toBe(0);
    expect(res.body.isAchieved).toBe(true);
  });
});

describe("PUT /api/goal-items/:id — multiplier accuracy", () => {
  it("updates remaining when requiredAmount changes (multiplier = 1)", async () => {
    const post = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 50,
    });
    const giId: number = post.body.id;

    const res = await request(app)
      .put(`/api/goal-items/${giId}`)
      .send({ requiredAmount: 200 });

    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(200);
    expect(res.body.isAchieved).toBe(false);
  });

  it("reflects multiplier > 1 when requiredAmount is updated", async () => {
    const post = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 10,
    });
    const giId: number = post.body.id;

    await db
      .update(goalsTable)
      .set({ multiplier: 4 })
      .where(eq(goalsTable.id, goalId));

    const res = await request(app)
      .put(`/api/goal-items/${giId}`)
      .send({ requiredAmount: 25 });

    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(100);
    expect(res.body.isAchieved).toBe(false);
  });

  it("reflects multiplier after goal multiplier changes on existing item", async () => {
    await db
      .update(itemsTable)
      .set({ currentAmount: 60 })
      .where(eq(itemsTable.id, itemId));

    const post = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 30,
    });
    const giId: number = post.body.id;

    await db
      .update(goalsTable)
      .set({ multiplier: 3 })
      .where(eq(goalsTable.id, goalId));

    const res = await request(app)
      .put(`/api/goal-items/${giId}`)
      .send({ requiredAmount: 30 });

    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(30);
    expect(res.body.isAchieved).toBe(false);
  });

  it("returns isAchieved = true when currentAmount covers requiredAmount × multiplier after update", async () => {
    await db
      .update(goalsTable)
      .set({ multiplier: 2 })
      .where(eq(goalsTable.id, goalId));
    await db
      .update(itemsTable)
      .set({ currentAmount: 100 })
      .where(eq(itemsTable.id, itemId));

    const post = await request(app).post("/api/goal-items").send({
      goalId,
      itemId,
      itemName: "Test Item",
      requiredAmount: 200,
    });
    const giId: number = post.body.id;

    const res = await request(app)
      .put(`/api/goal-items/${giId}`)
      .send({ requiredAmount: 50 });

    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(0);
    expect(res.body.isAchieved).toBe(true);
  });
});
