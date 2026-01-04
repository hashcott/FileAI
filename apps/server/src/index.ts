import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { appRouter, AppRouter } from "./routers";
import { createContext } from "./context";
import { connectDatabase } from "./db/connection";
import { Document } from "./db/models/Document";
import { getStorageAdapter } from "./services/storage";
import { JWT_SECRET } from "./config/jwt";

// Export types for the client
export type { AppRouter };

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Configure CORS to allow credentials and authorization headers
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use(express.json({ limit: "50mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// File download endpoint
app.get("/api/files/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    
    console.log("Download request for:", id);
    console.log("Auth header present:", !!authHeader);
    
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.log("No token in request");
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    // Verify token
    let userId: string;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId;
      console.log("Token verified for user:", userId);
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError);
      return res.status(401).json({ error: "Invalid token" });
    }

    // Find document
    const document = await Document.findOne({
      _id: id,
      userId,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Get file from storage
    const storage = await getStorageAdapter();
    const fileBuffer = await storage.download(document.originalPath);

    // Set response headers
    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.filename)}"`
    );
    res.setHeader("Content-Length", fileBuffer.length);

    // Send file
    res.send(fileBuffer);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// tRPC endpoint
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Start server
async function start() {
  try {
    // Connect to database
    await connectDatabase();
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();

