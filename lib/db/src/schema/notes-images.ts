import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const notesImagesTable = pgTable("notes_images", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type NotesImage = typeof notesImagesTable.$inferSelect;