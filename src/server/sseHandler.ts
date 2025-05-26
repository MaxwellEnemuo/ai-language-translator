import express from "express";
import { EventEmitter } from "events";
import createLogger from "../common/logger";
import clientManager from "./clientManager";

const logger = createLogger("sse-handler");

// Store SSE clients
const sseClients = new Set<express.Response>();

// Create event emitter for stats updates
export const statsEmitter = new EventEmitter();

/**
 * Initializes SSE endpoints and sets up event-driven updates
 * @param app Express application
 */
export function setupSSE(app: express.Application): void {
  // SSE endpoint for UI
  app.get("/stats", (req, res) => {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Send initial stats
    const initialStats = clientManager.getStats();
    res.write(`data: ${JSON.stringify(initialStats)}\n\n`);

    // Add client to tracking
    sseClients.add(res);

    // Handle client disconnect
    req.on("close", () => {
      sseClients.delete(res);
      logger.info("UI client disconnected from SSE");
    });

    logger.info("UI client connected to SSE endpoint");
  });

  // Listen for stats update events and broadcast to clients
  statsEmitter.on("stats-update", (stats) => {
    if (sseClients.size > 0) {
      const data = `data: ${JSON.stringify(stats)}\n\n`;

      sseClients.forEach((client) => {
        client.write(data);
      });
    }
  });

  logger.info("SSE handler initialized");
}

/**
 * Returns the current count of connected SSE clients
 */
export function getSseClientCount(): number {
  return sseClients.size;
}

/**
 * Broadcasts updated stats to all connected clients
 * Call this function whenever there's a change in client state
 */
export function broadcastStatsUpdate(): void {
  if (sseClients.size > 0) {
    const stats = clientManager.getStats();
    statsEmitter.emit("stats-update", stats);
    logger.debug("Stats update broadcast triggered");
  }
}
