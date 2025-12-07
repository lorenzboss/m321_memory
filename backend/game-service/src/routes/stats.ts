import { Request, Response, Router } from 'express';

const router = Router();

const STATS_SERVICE_BASE_URL = (process.env.STATS_SERVICE_URL ?? 'http://localhost:8003').replace(
  /\/+$/,
  '',
);
const REQUEST_TIMEOUT_MS = Number(process.env.STATS_SERVICE_TIMEOUT_MS ?? 2000);

type ProxyResult = {
  status: number;
  body: unknown;
};

function buildEndpoint(path: string): string {
  if (!path.startsWith('/')) {
    return `${STATS_SERVICE_BASE_URL}/${path}`;
  }
  return `${STATS_SERVICE_BASE_URL}${path}`;
}

function parseBody(text: string): unknown {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Returning raw stats payload because JSON parse failed:', error);
    return text;
  }
}

async function proxyStats(path: string): Promise<ProxyResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildEndpoint(path), {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const text = await response.text();
    return {
      status: response.status,
      body: parseBody(text),
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error('Timed out while contacting stats service');
      return {
        status: 504,
        body: { message: 'Stats service timeout.' },
      };
    }

    console.error('Failed to communicate with stats service:', error);
    return {
      status: 502,
      body: { message: 'Failed to communicate with stats service.' },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function sendProxyResult(res: Response, result: ProxyResult): void {
  if (typeof result.body === 'string') {
    res.status(result.status).send(result.body);
    return;
  }

  if (typeof result.body === 'undefined') {
    res.sendStatus(result.status);
    return;
  }

  res.status(result.status).json(result.body);
}

router.get('/stats/users', async (_req: Request, res: Response) => {
  const result = await proxyStats('/stats');
  sendProxyResult(res, result);
});

router.get('/stats/users/:username', async (req: Request, res: Response) => {
  const encodedUsername = encodeURIComponent(req.params.username);
  const result = await proxyStats(`/stats/${encodedUsername}`);
  sendProxyResult(res, result);
});

router.get('/stats/leaderboard', async (req: Request, res: Response) => {
  const params = new URLSearchParams();
  if (req.query.limit) {
    params.set('limit', String(req.query.limit));
  }
  const query = params.toString();
  const endpoint = query ? `/leaderboard?${query}` : '/leaderboard';
  const result = await proxyStats(endpoint);
  sendProxyResult(res, result);
});

export default router;
