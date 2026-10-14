import { Router } from "express";
import { getWosEvents } from "../lib/todoist.js";

const todoistRouter = Router();

todoistRouter.get("/todoist/events", async (_req, res) => {
  try {
    const tasks = await getWosEvents();

    const events = tasks.map((t) => ({
      id: t.id,
      content: t.content,
      description: t.description || null,
      due: t.due
        ? {
            date: t.due.date,
            datetime: t.due.datetime,
            string: t.due.string,
            is_recurring: t.due.is_recurring,
          }
        : null,
      priority: t.priority,
    }));

    events.sort((a, b) => {
      const aTime = a.due?.datetime ?? a.due?.date ?? "9999";
      const bTime = b.due?.datetime ?? b.due?.date ?? "9999";
      return aTime.localeCompare(bTime);
    });

    res.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isSetupError =
      message.includes("not configured") ||
      message.includes("not found");
    res.status(isSetupError ? 503 : 502).json({ error: message });
  }
});

export default todoistRouter;
