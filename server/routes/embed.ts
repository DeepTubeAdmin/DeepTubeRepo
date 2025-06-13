/**
 * Embed Routes
 *
 * Handles routes related to embedded content views
 */

import { Express } from "express";
import { handleEmbedRequest } from "../embed";
import { storage as dbStorage } from "../storage";



export function registerEmbedRoutes(app: Express) {
  const embedHandler = (req: any, res: any) => {
    handleEmbedRequest(req, res, dbStorage.getVideoById);
  };

  // Embed view for content - allows direct embedding on external sites
  app.get("/media/:id/embed", embedHandler);

  // Alternative route to support the embed URL format in share dialog
  app.get("/embed/:id", embedHandler);

  console.log("Embed routes registered successfully");
}
