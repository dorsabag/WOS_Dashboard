import { Router, type IRouter } from "express";
import healthRouter from "./health";
import troopsRouter from "./troops";
import marchesRouter from "./marches";
import itemsRouter from "./items";
import goalsRouter from "./goals";
import goalItemsRouter from "./goal-items";
import notesRouter from "./notes";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import todoistRouter from "./todoist";
import iconsRouter from "./icons";
import profileRouter from "./profile";
import leaderboardRouter from "./leaderboard";
import { requireOwner } from "../middlewares/ownerAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireOwner);
router.get("/auth/access", (_req, res) => res.json({ authorized: true }));
router.use("/troops", troopsRouter);
router.use("/marches", marchesRouter);
router.use("/items", itemsRouter);
router.use("/goals", goalsRouter);
router.use("/goal-items", goalItemsRouter);
router.use("/notes", notesRouter);
router.use("/dashboard", dashboardRouter);
router.use(storageRouter);
router.use(todoistRouter);
router.use(iconsRouter);
router.use("/profile", profileRouter);
router.use("/leaderboard", leaderboardRouter);

export default router;
