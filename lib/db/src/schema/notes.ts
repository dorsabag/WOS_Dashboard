import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notesTable).omit({ id: true, updatedAt: true });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;
