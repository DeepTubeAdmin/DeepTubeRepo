import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Export these functions for use in other modules
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "video-marketplace-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request received:", JSON.stringify({
        ...req.body,
        password: "***REDACTED***"  // Don't log the actual password
      }));
      
      // Process the request body to handle date conversion issues
      let processedData = { ...req.body };
      
      // Ensure dateOfBirth is properly formatted as a Date object
      if (processedData.dateOfBirth) {
        if (typeof processedData.dateOfBirth === 'string') {
          processedData.dateOfBirth = new Date(processedData.dateOfBirth);
        } else if (typeof processedData.dateOfBirth === 'object' && processedData.dateOfBirth !== null) {
          // Already a Date object or has date-like properties
          if ('toISOString' in processedData.dateOfBirth) {
            // It's already a proper Date object, keep it as is
          } else {
            // Convert from possible object notation: { year, month, day }
            try {
              const dateObj = processedData.dateOfBirth;
              if (dateObj.year && dateObj.month !== undefined && dateObj.day !== undefined) {
                processedData.dateOfBirth = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
              } else {
                processedData.dateOfBirth = new Date(processedData.dateOfBirth);
              }
            } catch (err) {
              console.error("Error converting date:", err);
              return res.status(400).json({ 
                error: "Invalid date format", 
                details: "Please provide a valid date of birth" 
              });
            }
          }
        }
      }

      // Use the schema validation to ensure username format is valid
      const { insertUserSchema } = await import("@shared/schema");
      
      try {
        // This will throw if validation fails
        insertUserSchema.parse(processedData);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        return res.status(400).json({ 
          error: "Validation failed", 
          details: (validationError as Error).message 
        });
      }
      
      // Check for existing username
      const existingUser = await storage.getUserByUsername(processedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Format date for database storage
      let userData = { ...processedData };

      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user?: Express.User, info?: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}