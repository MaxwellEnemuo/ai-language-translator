import http from "http";
import express from "express";
import path from "path";
import { setupSSE } from "./sseHandler";
import { setupWebSocketServer, closeAllConnections } from "./wsHandler";
import createLogger from "../common/logger";

const logger = createLogger("server-main");

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure static file serving
app.use(express.static(path.join(__dirname, "public")));

// Root route to serve the UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Initialize SSE for UI updates
setupSSE(app);

// Initialize WebSocket server
const wss = setupWebSocketServer(server);

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down server gracefully...");
  await closeAllConnections(wss);
  server.close(() => {
    logger.info("Server shut down.");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down server gracefully...");
  await closeAllConnections(wss);
  server.close(() => {
    logger.info("Server shut down.");
    process.exit(0);
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`HTTP & WebSocket Server started on port ${PORT}`);
  logger.info(`Web UI available at http://localhost:${PORT}`);
});
