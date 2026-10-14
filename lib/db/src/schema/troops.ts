import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const troopsTable = pgTable("troops", {
  id: serial("id").primaryKey(),
  infantry: integer("infantry").notNull().default(0),
  lancer: integer("lancer").notNull().default(0),
  marksman: integer("marksman").notNull().default(0),
  heliosInfantry: integer("helios_infantry").notNull().default(0),
  heliosLancer: integer("helios_lancer").notNull().default(0),
  heliosMarksman: integer("helios_marksman").notNull().default(0),
  deploymentCapacity: integer("deployment_capacity").notNull().default(0),
  deploymentBonus: integer("deployment_bonus").notNull().default(0),
  cyrilleBonus: integer("cyrille_bonus").notNull().default(0),
  rallyCapacity: integer("rally_capacity").notNull().default(0),
  rallyBonus: integer("rally_bonus").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTroopsSchema = createInsertSchema(troopsTable).omit({ id: true, updatedAt: true });
export type InsertTroops = z.infer<typeof insertTroopsSchema>;
export type Troops = typeof troopsTable.$inferSelect;
