import { Router } from "express";
import { db, itemsTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { CreateItemBody, UpdateItemBody, UpdateItemParams, DeleteItemParams, GetItemsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/categories", async (_req, res) => {
  const rows = await db
    .select({
      name: itemsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(itemsTable)
    .groupBy(itemsTable.category)
    .orderBy(asc(itemsTable.category));
  res.json(rows.map((r) => ({ name: r.name, count: r.count })));
});

router.get("/", async (req, res) => {
  const params = GetItemsQueryParams.safeParse(req.query);
  let items;
  if (params.success && params.data.category) {
    items = await db.select().from(itemsTable)
      .where(eq(itemsTable.category, params.data.category))
      .orderBy(asc(itemsTable.category), asc(itemsTable.name));
  } else {
    items = await db.select().from(itemsTable)
      .orderBy(asc(itemsTable.category), asc(itemsTable.name));
  }
  res.json(items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    subcategory: i.subcategory,
    currentAmount: i.currentAmount,
    unit: i.unit,
    notes: i.notes,
    imageUrl: i.imageUrl,
    updatedAt: i.updatedAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [item] = await db.insert(itemsTable).values({
    name: d.name,
    category: d.category,
    subcategory: d.subcategory,
    currentAmount: d.currentAmount ?? 0,
    unit: d.unit,
    notes: d.notes,
    imageUrl: d.imageUrl,
  }).returning();
  res.status(201).json({
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    currentAmount: item.currentAmount,
    unit: item.unit,
    notes: item.notes,
    imageUrl: item.imageUrl,
    updatedAt: item.updatedAt.toISOString(),
  });
});

router.put("/:id", async (req, res) => {
  const params = UpdateItemParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [item] = await db.update(itemsTable)
    .set({
      ...(d.name !== undefined && { name: d.name }),
      ...(d.category !== undefined && { category: d.category }),
      ...(d.subcategory !== undefined && { subcategory: d.subcategory }),
      ...(d.currentAmount !== undefined && { currentAmount: d.currentAmount }),
      ...(d.unit !== undefined && { unit: d.unit }),
      ...(d.notes !== undefined && { notes: d.notes }),
      ...(d.imageUrl !== undefined && { imageUrl: d.imageUrl }),
      updatedAt: new Date(),
    })
    .where(eq(itemsTable.id, params.data.id))
    .returning();
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  res.json({
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    currentAmount: item.currentAmount,
    unit: item.unit,
    notes: item.notes,
    imageUrl: item.imageUrl,
    updatedAt: item.updatedAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const params = DeleteItemParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(itemsTable).where(eq(itemsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
