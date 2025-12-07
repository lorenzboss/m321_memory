import { Request, Response, Router } from 'express';

const healthRouter = Router();

/**
 * GET /health
 * Health check endpoint (no authentication required)
 * Returns service status and timestamp
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'game-service',
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
