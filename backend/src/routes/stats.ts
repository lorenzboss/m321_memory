import { Request, Response, Router } from "express";
import { statsService } from "../services/StatsService";

const router = Router();

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await statsService.getAllStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/stats/:username", async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const stats = await statsService.getStatsByUsername(username);

    if (!stats) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await statsService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
