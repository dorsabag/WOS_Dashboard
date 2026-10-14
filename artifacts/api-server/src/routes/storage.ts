import { Router, raw } from "express";
import { Readable } from "node:stream";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

// Mounted after requireOwner: upload requests, binary uploads, and reads are private.
const router = Router();
const storage = new ObjectStorageService();
router.post("/storage/uploads/request-url", async (req, res) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid upload metadata" }); return; }
  const uploadPath = await storage.getObjectEntityUploadURL();
  const uploadURL = new URL(uploadPath, process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`).href;
  res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath: storage.normalizeObjectEntityPath(uploadPath), metadata: parsed.data }));
});
router.put("/storage/uploads/:id", raw({ type: () => true, limit: process.env.MAX_UPLOAD_BYTES || "25mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body)) { res.status(400).json({ error: "Expected binary file" }); return; }
  try {
    await storage.saveUpload(req.params.id, req.body, req.get("content-type")?.split(";")[0] || "application/octet-stream");
    res.status(201).end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(400).json({ error: "Invalid upload id" }); return; }
    if ((error as NodeJS.ErrnoException).code === "EEXIST") { res.status(409).json({ error: "Object already exists" }); return; }
    throw error;
  }
});
router.get(["/storage/objects/*objectPath", "/storage/public-objects/*objectPath"], async (req, res) => {
  try {
    const raw = req.params.objectPath;
    const prefix = req.path.startsWith("/storage/public-objects/") ? "public/" : "";
    const objectPath = `/objects/${prefix}${Array.isArray(raw) ? raw.join("/") : raw}`;
    const response = await storage.downloadObject(await storage.getObjectEntityFile(objectPath));
    response.headers.forEach((value, name) => res.setHeader(name, value));
    const stream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Object not found" }); return; }
    throw error;
  }
});
export default router;
