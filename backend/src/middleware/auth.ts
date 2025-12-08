import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip auth for health check and auth routes
  if (req.path === "/health" || req.path.startsWith("/auth/")) {
    return next();
  }

  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as {
      userId: number;
      username: string;
    };
    (req as AuthRequest).userId = decoded.userId;
    (req as AuthRequest).username = decoded.username;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
