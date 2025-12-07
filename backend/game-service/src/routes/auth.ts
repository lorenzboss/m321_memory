import { Request, Response, Router } from 'express';
import { executeQuery } from '../db';

// Interface for user account data
interface UserAccount {
  uuid: string;
  name: string;
  email: string;
}

const authRouter = Router();

/**
 * GET /auth
 * Returns authenticated user information
 * Requires valid JWT token
 */
authRouter.get('/auth', async (req: Request, res: Response) => {
  const auth = req.auth;

  try {
    // Get user details from the accounts table using the sub (uuid) value
    const userResult = await executeQuery(
      'SELECT uuid, name, email FROM accounts WHERE uuid = $1 AND active = true',
      [auth.sub as string],
    );

    if (userResult.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found or inactive.',
        statusCode: 404,
      });
    }

    const user = userResult[0] as UserAccount;

    res.json({
      user: {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database error while fetching user:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to fetch user information.',
      statusCode: 500,
    });
  }
});

export default authRouter;
