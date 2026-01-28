import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// Health check - respond immediately with version
const BUILD_VERSION = "2026-01-28-v2";
app.get("/health", (_req, res) => res.status(200).send(`OK v${BUILD_VERSION}`));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Detect production by NODE_ENV OR by running from bundled .cjs file
const isBundled = typeof __filename !== 'undefined' && 
  (__filename.endsWith('.cjs') || __filename.includes('/dist/'));
const isProduction = process.env.NODE_ENV === "production" || isBundled;

const port = parseInt(process.env.PORT || "5000", 10);

// Start listening FIRST, then load routes and database
httpServer.listen(port, "0.0.0.0", async () => {
  log(`serving on port ${port}`);
  
  try {
    // Now load and register routes
    const { registerRoutes, scheduleWeeklyReset, scheduleComboSettlement } = await import("./routes");
    await registerRoutes(httpServer, app);
    
    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });
    
    // Setup static serving or vite
    if (isProduction) {
      const { serveStatic } = await import("./static");
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }
    
    // Database operations - run after server is ready
    const { cleanupUserContent, seedMarkets, seedReferralCodes, restoreMissingStlr, fixTargetUser, fixHighBalanceUsers, fixWallet10d6d4, fixStlrCap, resetAllBalancesOnce } = await import("./seed");
    const { storage } = await import("./storage");
    const { startSimulation } = await import("./simulation");
    
    await cleanupUserContent();
    await seedMarkets();
    await seedReferralCodes();
    await restoreMissingStlr();

    const markets = await storage.getMarkets();
    if (markets.length > 0) {
      startSimulation(markets);
      log(`Market simulation started with ${markets.length} markets`, "simulation");
    }
    
    await fixTargetUser();
    await fixHighBalanceUsers();
    await fixWallet10d6d4();
    await fixStlrCap();
    await resetAllBalancesOnce();
    
    await scheduleWeeklyReset();
    await scheduleComboSettlement();
    
    log("All startup tasks completed", "startup");
  } catch (error: any) {
    console.error("Startup error:", error.message);
  }
});
