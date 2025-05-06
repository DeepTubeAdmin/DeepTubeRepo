import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
console.log("Setting up Cloudinary configuration...");

// Special handling for Replit environment where env vars might have unusual formats
let cloudName = '';
let apiKey = process.env.CLOUDINARY_API_KEY || '';
let apiSecret = process.env.CLOUDINARY_API_SECRET || '';

// Search for cloud name in environment variables - there are multiple possible formats
// Check standard env var first
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  console.log(`Using standard CLOUDINARY_CLOUD_NAME: ${cloudName}`);

  // Check if cloudName contains the entire URL (happens in some environments)
  if (cloudName.startsWith('CLOUDINARY_URL=cloudinary://')) {
    console.log('Detected CLOUDINARY_URL format in CLOUDINARY_CLOUD_NAME, extracting values...');
    try {
      // Extract from format like: CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
      const match = cloudName.match(/CLOUDINARY_URL=cloudinary:\/\/([^:]+):([^@]+)@([^/]+)/);
      if (match) {
        const [, extractedApiKey, extractedApiSecret, extractedCloudName] = match;
        console.log(`Extracted cloud_name: ${extractedCloudName}`);
        
        // Override with extracted values
        cloudName = extractedCloudName;
        if (!apiKey) apiKey = extractedApiKey;
        if (!apiSecret) apiSecret = extractedApiSecret;
      }
    } catch (error) {
      console.error('Error extracting Cloudinary credentials from URL format:', error);
    }
  }
} else {
  // Look for other environment variable patterns
  console.log('Scanning environment variables for Cloudinary cloud name...');
  
  // Check each environment variable for patterns
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    
    // Check if it's a cloud name with URL as value
    if (value.includes('CLOUDINARY_URL=cloudinary://')) {
      console.log(`Found Cloudinary URL in environment variable ${key}`);
      
      try {
        // Extract from format like: CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
        const match = value.match(/CLOUDINARY_URL=cloudinary:\/\/([^:]+):([^@]+)@([^/]+)/);
        if (match) {
          const [, extractedApiKey, extractedApiSecret, extractedCloudName] = match;
          console.log(`Extracted cloud_name: ${extractedCloudName} from ${key}`);
          
          // Use the key as cloud_name if it seems valid, otherwise use the extracted one
          if (key && !key.includes('=') && !key.startsWith('CLOUDINARY_')) {
            cloudName = key;
            console.log(`Using environment variable name as cloud_name: ${cloudName}`);
          } else {
            cloudName = extractedCloudName;
            console.log(`Using extracted cloud_name: ${cloudName}`);
          }
          
          if (!apiKey) apiKey = extractedApiKey;
          if (!apiSecret) apiSecret = extractedApiSecret;
          break;
        }
      } catch (error) {
        console.error(`Error extracting from ${key}:`, error);
      }
    }
  }
}

// Check if we have all required configuration
if (cloudName && apiKey && apiSecret) {
  console.log("Configuring Cloudinary with extracted credentials");
  cloudinary.config({ 
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  
  // Log configuration (without revealing actual keys)
  console.log(`Cloudinary configuration: cloud_name='${cloudName}', ` +
    `api_key=<${apiKey.length} chars>, ` +
    `api_secret=<${apiSecret.length} chars>`);
} else {
  console.warn("Cloudinary credentials incomplete or not found:");
  console.warn(`- cloud_name: ${cloudName ? 'Present' : 'Missing'}`);
  console.warn(`- api_key: ${apiKey ? 'Present' : 'Missing'}`);
  console.warn(`- api_secret: ${apiSecret ? 'Present' : 'Missing'}`);
}

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
