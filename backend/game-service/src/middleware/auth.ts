import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_URL = 'http://localhost:8002';

// Extend the Request interface to include auth property
declare global {
  namespace Express {
    interface Request {
      auth?: any;
    }
  }
}

/**
 * JWT Authentication middleware
 * Validates JWT tokens from various sources (Authorization header, cookies)
 * and adds decoded token data to the request object
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }

  // Try to get token from multiple sources
  let token: string | null = null;

  // First try Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  // Then try auth cookie
  else if (req.cookies.auth) {
    token = req.cookies.auth;
  }
  // Finally try raw authorization header
  else if (req.headers.authorization) {
    token = req.headers.authorization;
  }

  if (!token) {
    console.error('No auth token found - returning 401');
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No auth token found. Please login first.',
      authUrl: AUTH_URL,
      statusCode: 401,
    });
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not configured - server misconfiguration');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Authentication service is not properly configured.',
      statusCode: 500,
    });
  }

  // At this point we know both token and JWT_SECRET are defined
  const tokenToVerify: string = token;
  const secretToUse: string = JWT_SECRET;

  return jwt.verify(tokenToVerify, secretToUse, (err: any, decoded: any) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      console.error(
        'JWT Secret being used:',
        JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'undefined',
      );

      return res.status(401).json({
        error: 'Invalid authentication token',
        message: 'Your session has expired or is invalid. Please login again.',
        details: err.message,
        authUrl: AUTH_URL,
        statusCode: 401,
      });
    }

    console.log(
      'JWT verified successfully for user:',
      decoded.sub || decoded.username || 'unknown',
    );
    // Add decoded token to request object for use in routes
    req.auth = decoded;
    return next();
  });
};
