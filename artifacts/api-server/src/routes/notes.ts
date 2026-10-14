import { Router } from "express";
import { db, notesImagesTable, notesTable } from "@workspace/db";
import { asc, desc, eq } from "drizzle-orm";
import { RegisterNoteImageBody, UpdateNotesBody } from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

async function getSingletonNote() {
  const [note] = await db.select().from(notesTable).orderBy(asc(notesTable.id)).limit(1);
  return note;
}

router.get("/", async (_req, res) => {
  let note = await getSingletonNote();
  if (!note) {
    [note] = await db.insert(notesTable).values({}).returning();
  }
  res.json({
    id: note.id,
    content: note.content,
    updatedAt: note.updatedAt.toISOString(),
  });
});

router.put("/", async (req, res) => {
  const parsed = UpdateNotesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = parsed.data;
  let existing = await getSingletonNote();
  let note;
  if (!existing) {
    [note] = await db.insert(notesTable).values({ content: data.content }).returning();
  } else {
    [note] = await db.update(notesTable)
      .set({ content: data.content, updatedAt: new Date() })
      .where(eq(notesTable.id, existing.id))
      .returning();
  }
  res.json({
    id: note.id,
    content: note.content,
    updatedAt: note.updatedAt.toISOString(),
  });
});

router.get("/images", async (_req, res) => {
  const images = await db
    .select()
    .from(notesImagesTable)
    .orderBy(desc(notesImagesTable.createdAt), desc(notesImagesTable.id));

  res.json(images.map(image => ({
    id: image.id,
    objectPath: image.objectPath,
    fileName: image.fileName,
    contentType: image.contentType,
    size: image.size,
    createdAt: image.createdAt.toISOString(),
  })));
});

router.post("/images", async (req, res) => {
  const parsed = RegisterNoteImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid image metadata" });
    return;
  }

  const { objectPath, fileName, contentType, size } = parsed.data;
  if (!objectPath.startsWith("/objects/") || !contentType.toLowerCase().startsWith("image/")) {
    res.status(400).json({ error: "Only uploaded image objects are allowed" });
    return;
  }

  const [image] = await db.insert(notesImagesTable).values({
    objectPath,
    fileName,
    contentType,
    size,
  }).returning();

  res.status(201).json({
    id: image.id,
    objectPath: image.objectPath,
    fileName: image.fileName,
    contentType: image.contentType,
    size: image.size,
    createdAt: image.createdAt.toISOString(),
  });
});

router.delete("/images/:id", async (req, res) => {
  // Reject non-integer ids (e.g. "1abc")
  if (!/^\d+$/.test(req.params.id)) {
    res.status(400).json({ error: "Invalid image id" });
    return;
  }
  const id = parseInt(req.params.id, 10);

  const [image] = await db
    .select()
    .from(notesImagesTable)
    .where(eq(notesImagesTable.id, id))
    .limit(1);

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  // Delete the storage object first. A missing object is treated as already
  // gone (success). Any other error is a transient failure — return 500 so the
  // client can retry; the DB record is intentionally kept to avoid orphaning.
  try {
    await objectStorageService.deleteObjectEntity(image.objectPath);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      // Object already gone — proceed to remove the DB record
    } else {
      req.log.error({ err }, "Failed to delete image object from storage");
      res.status(500).json({ error: "Could not delete image from storage. Please try again." });
      return;
    }
  }

  await db.delete(notesImagesTable).where(eq(notesImagesTable.id, id));

  res.status(204).end();
});

export default router;
