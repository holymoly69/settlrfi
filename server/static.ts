import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production, __dirname might be wrong when bundled with esbuild
  // Use the actual location of the running script
  let distPath = path.resolve(__dirname, "public");
  
  // If running from dist/index.cjs, __dirname should be dist/
  // But esbuild might not set it correctly, so fallback to process.cwd()
  if (!fs.existsSync(distPath)) {
    distPath = path.resolve(process.cwd(), "dist", "public");
  }
  
  console.log(`[static] Serving from: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback: serve index.html for non-API GET requests only
  app.get("*", (req, res, next) => {
    // Don't intercept API routes - let them 404 naturally
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
