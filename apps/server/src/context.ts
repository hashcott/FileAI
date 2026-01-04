import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";
import { Context } from "./trpc";
import { JWT_SECRET } from "./config/jwt";

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  // Get token from authorization header
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return {};
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };

    return {
      userId: decoded.userId,
      userRole: decoded.role,
    };
  } catch (error) {
    // Invalid token
    return {};
  }
}

