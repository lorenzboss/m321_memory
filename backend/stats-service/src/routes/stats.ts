import { Request, Response, Router } from "express";
import {
  getAllUserStats,
  getLeaderboard,
  getUserStatsByUsername,
} from "../services/StatsRepository";

const router = Router();

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getAllUserStats();
    res.json(stats);
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    res.status(500).json({ message: "Failed to fetch stats." });
  }
});

router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const limitParam = req.query.limit as string | undefined;
    const parsedLimit = limitParam
      ? Number.parseInt(limitParam, 10)
      : undefined;
    const leaderboard = await getLeaderboard(parsedLimit);
    res.json(leaderboard);
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard." });
  }
});

router.get("/stats/:username", async (req: Request, res: Response) => {
  try {
    const stat = await getUserStatsByUsername(req.params.username);
    if (!stat) {
      res.status(404).json({ message: "Stats not found for this user." });
      return;
    }

    res.json(stat);
  } catch (error) {
    console.error("Failed to fetch stats by username:", error);
    res.status(500).json({ message: "Failed to fetch stats for this user." });
  }
});

export default router;
