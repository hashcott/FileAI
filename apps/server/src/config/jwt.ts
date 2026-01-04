// Central JWT configuration - all JWT operations should use this
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Debug: log which secret is being used (first 5 chars only for security)
console.log(`🔐 JWT Config loaded. Secret starts with: ${JWT_SECRET.substring(0, 5)}...`);

