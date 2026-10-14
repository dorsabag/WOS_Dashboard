import { pgTable, serial, integer, text, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").notNull().default(false),
  multiplier: integer("multiplier").notNull().default(1),
  deadlineEventId: text("deadline_event_id"),
  iconUrl1: text("icon_url_1"),
  iconUrl2: text("icon_url_2"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const goalItemsTable = pgTable("goal_items", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goalsTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => itemsTable.id, { onDelete: "set null" }),
  itemName: text("item_name").notNull(),
  requiredAmount: integer("required_amount").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const goalCompletionsTable = pgTable("goal_completions", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goalsTable.id, { onDelete: "cascade" }),
  action: text("action").notNull().default("complete"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  itemsConsumed: json("items_consumed").notNull().$type<{ itemName: string; amountConsumed: number }[]>(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;

export const insertGoalItemSchema = createInsertSchema(goalItemsTable).omit({ id: true, createdAt: true });
export type InsertGoalItem = z.infer<typeof insertGoalItemSchema>;
export type GoalItem = typeof goalItemsTable.$inferSelect;

export type GoalCompletion = typeof goalCompletionsTable.$inferSelect;
