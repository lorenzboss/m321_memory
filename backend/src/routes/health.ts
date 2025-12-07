import { Request, Response, Router } from "express";

const router = Router();

router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "memory-game-backend",
  });
});

export default router;
