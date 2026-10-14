import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
vi.mock("../middlewares/ownerAuth", () => ({
  requireOwner: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import request from "supertest";
import app from "../app";
import { db, notesImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

// ---------------------------------------------------------------------------
// POST /api/notes/images — registration & phantom-entry safety
// ---------------------------------------------------------------------------

describe("POST /api/notes/images", () => {
  const VALID_BODY = {
    objectPath: "/objects/uploads/post-test-uuid-9999",
    fileName: "post-test.png",
    contentType: "image/png",
    size: 8192,
  };

  afterEach(async () => {
    // Remove any record that may have been inserted by a test
    await db
      .delete(notesImagesTable)
      .where(eq(notesImagesTable.objectPath, VALID_BODY.objectPath))
      .catch(() => {});
    vi.restoreAllMocks();
  });

  it("registers an image and returns 201 with the new record", async () => {
    const res = await request(app).post("/api/notes/images").send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      objectPath: VALID_BODY.objectPath,
      fileName: VALID_BODY.fileName,
      contentType: VALID_BODY.contentType,
      size: VALID_BODY.size,
      createdAt: expect.any(String),
    });

    // Verify the record really exists in the DB
    const rows = await db
      .select()
      .from(notesImagesTable)
      .where(eq(notesImagesTable.objectPath, VALID_BODY.objectPath));
    expect(rows).toHaveLength(1);
  });

  it("returns 500 and leaves no phantom record when the DB insert fails", async () => {
    // Simulate a transient DB failure (e.g. network outage during metadata registration)
    vi.spyOn(db, "insert").mockImplementationOnce(() => {
      throw new Error("DB connection lost");
    });

    const res = await request(app).post("/api/notes/images").send(VALID_BODY);

    expect(res.status).toBe(500);

    // No phantom entry with this objectPath must remain after the failed POST
    const rows = await db
      .select()
      .from(notesImagesTable)
      .where(eq(notesImagesTable.objectPath, VALID_BODY.objectPath));
    expect(rows).toHaveLength(0);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/api/notes/images")
      .send({ fileName: "x.png", contentType: "image/png", size: 100 }); // missing objectPath
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 when objectPath does not start with /objects/", async () => {
    const res = await request(app)
      .post("/api/notes/images")
      .send({ ...VALID_BODY, objectPath: "/bad/path/image.png" });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 when contentType is not an image", async () => {
    const res = await request(app)
      .post("/api/notes/images")
      .send({ ...VALID_BODY, contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});

// ---------------------------------------------------------------------------
// Mock the ObjectStorageService so tests never touch real storage
// ---------------------------------------------------------------------------

// Shared spy so individual tests can change behaviour per-test
const mockDeleteObjectEntity = vi.fn<(objectPath: string) => Promise<void>>().mockResolvedValue(undefined);

vi.mock("../lib/objectStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/objectStorage")>();
  class MockObjectStorageService {
    deleteObjectEntity(objectPath: string) {
      return mockDeleteObjectEntity(objectPath);
    }
  }
  return {
    ...actual,
    ObjectStorageService: MockObjectStorageService,
  };
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const FAKE_OBJECT_PATH = "/objects/uploads/test-uuid-1234";

let imageId: number;

beforeEach(async () => {
  const [img] = await db
    .insert(notesImagesTable)
    .values({
      objectPath: FAKE_OBJECT_PATH,
      fileName: "test-screenshot.png",
      contentType: "image/png",
      size: 12345,
    })
    .returning();
  imageId = img.id;
});

afterEach(async () => {
  await db.delete(notesImagesTable).where(eq(notesImagesTable.id, imageId)).catch(() => {});
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// DELETE /api/notes/images/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/notes/images/:id", () => {
  it("returns 204 and removes the DB record when storage deletion succeeds", async () => {
    mockDeleteObjectEntity.mockResolvedValue(undefined);

    const res = await request(app).delete(`/api/notes/images/${imageId}`);

    expect(res.status).toBe(204);
    expect(mockDeleteObjectEntity).toHaveBeenCalledWith(FAKE_OBJECT_PATH);

    // Record must be gone
    const rows = await db
      .select()
      .from(notesImagesTable)
      .where(eq(notesImagesTable.id, imageId));
    expect(rows).toHaveLength(0);
    // Prevent afterEach from trying to delete again
    imageId = -1;
  });

  it("returns 404 when the image record does not exist", async () => {
    const res = await request(app).delete("/api/notes/images/999999999");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 204 and removes the DB record when the storage object is already missing", async () => {
    mockDeleteObjectEntity.mockRejectedValue(new ObjectNotFoundError());

    const res = await request(app).delete(`/api/notes/images/${imageId}`);

    expect(res.status).toBe(204);

    // DB record should be cleaned up even though storage object was missing
    const rows = await db
      .select()
      .from(notesImagesTable)
      .where(eq(notesImagesTable.id, imageId));
    expect(rows).toHaveLength(0);
    imageId = -1;
  });

  it("returns 500 and retains the DB record when storage deletion fails transiently", async () => {
    mockDeleteObjectEntity.mockRejectedValue(new Error("storage service temporarily unavailable"));

    const res = await request(app).delete(`/api/notes/images/${imageId}`);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: expect.any(String) });

    // DB record must be retained so the user can retry
    const rows = await db
      .select()
      .from(notesImagesTable)
      .where(eq(notesImagesTable.id, imageId));
    expect(rows).toHaveLength(1);
  });

  it("returns 400 for a malformed id like '1abc'", async () => {
    const res = await request(app).delete("/api/notes/images/1abc");
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await request(app).delete("/api/notes/images/abc");
    expect(res.status).toBe(400);
  });
});
