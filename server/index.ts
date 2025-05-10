import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";
import thumbnailService from "./services/ThumbnailService";

// Check if FFmpeg is available
console.log("Checking FFmpeg availability...");

(async () => {
  try {
    const ffmpegTest = await thumbnailService.testFFmpegAvailability();
    if (ffmpegTest.success) {
      console.log(`✓ FFmpeg is available: ${ffmpegTest.message}`);
      if (ffmpegTest.details?.version) {
        console.log(`  Version: ${ffmpegTest.details.version}`);
      }
    } else {
      console.warn(`⚠ FFmpeg may not be available: ${ffmpegTest.message}`);
      console.warn("Some thumbnail generation features might not work correctly.");
    }
  } catch (error) {
    console.error("Error checking FFmpeg:", error);
  }
})();

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Increase JSON payload size limit to 500MB for large uploads
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: false, limit: '500mb' }));

// Serve uploaded files statically - make sure this happens before other routes
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve placeholder files statically
app.use('/placeholder', express.static(path.join(__dirname, '../placeholder')));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
