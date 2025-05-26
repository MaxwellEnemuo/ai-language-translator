import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";
import http, { IncomingMessage } from "http";
import { jokes } from "./jokes";
import { TranslatedJoke } from "../common/types";
import createLogger from "../common/logger";
import { getMessageString } from "./utils";
import clientManager from "./clientManager";
import { broadcastStatsUpdate } from "./sseHandler";

const logger = createLogger("websocket-handler");
const SEND_JOKE_INTERVAL = process.env.SEND_JOKE_INTERVAL_MS
  ? parseInt(process.env.SEND_JOKE_INTERVAL_MS, 10)
  : 200;

export function setupWebSocketServer(server: http.Server): WebSocketServer {
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server });

  logger.info("WebSocket Server handler initializing");

  wss.on("connection", handleNewConnection);

  wss.on("error", (error: Error) => {
    logger.error(`WebSocket Server error: ${error.message}`, {
      error: error.message,
    });
  });

  return wss;
}

// Handle new WebSocket connections
function handleNewConnection(ws: WebSocket, req: IncomingMessage) {
  const clientId = clientManager.getWebSocketClientId(ws, req);
  let currentJokeIndex = 0;

  logger.info("Client connected", { clientId });

  const jokeIntervalId = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const jokeToSend = jokes[currentJokeIndex % jokes.length];
      try {
        ws.send(JSON.stringify(jokeToSend));
        logger.info(
          `Sent joke id ${jokeToSend.id}: "${jokeToSend.joke.substring(
            0,
            30
          )}..." to ${clientId}`,
          { clientId, jokeId: jokeToSend.id }
        );
        currentJokeIndex++;

        // Update statistics
        clientManager.incrementJokesSent(ws);
        // Broadcast updated stats to all connected UI clients
        broadcastStatsUpdate();
      } catch (error: any) {
        logger.error(`Error sending joke to ${clientId}: ${error.message}`, {
          clientId,
          error: error.message,
        });
      }
    }
  }, SEND_JOKE_INTERVAL);

  // Register client with client manager
  clientManager.addClient(ws, clientId, jokeIntervalId);

  // Set up event handlers for this connection
  setupMessageHandler(ws, clientId);
  setupDisconnectionHandlers(ws, clientId);
}

// Set up message handler for a WebSocket connection
function setupMessageHandler(ws: WebSocket, clientId: string) {
  ws.on("message", (message: RawData) => {
    const messageString = getMessageString(message, clientId);
    if (messageString === null) {
      return;
    }

    try {
      const translatedJoke: TranslatedJoke = JSON.parse(messageString);
      if (
        translatedJoke &&
        typeof translatedJoke.id === "number" &&
        typeof translatedJoke.translated_joke === "string"
      ) {
        logger.info(
          `Received translated joke id ${
            translatedJoke.id
          } from ${clientId}: "${translatedJoke.translated_joke.substring(
            0,
            30
          )}..."`,
          { clientId, jokeId: translatedJoke.id }
        );

        // Update statistics
        clientManager.incrementTranslationsReceived(
          ws,
          translatedJoke.translationDurationMs
        );
        // Broadcast updated stats to all connected UI clients
        broadcastStatsUpdate();

        if (translatedJoke.translationDurationMs !== undefined) {
          logger.info(
            `Translation for joke ${translatedJoke.id} took ${translatedJoke.translationDurationMs}ms`
          );
        }
      } else {
        logger.warn(
          `Received malformed translated joke from ${clientId}: ${messageString}`,
          { clientId, messageString }
        );
      }
    } catch (error: any) {
      logger.error(
        `Error processing message from ${clientId}: ${error.message}`,
        { clientId, messageString, error: error.message }
      );
    }
  });
}

// Set up disconnection handlers for a WebSocket connection
function setupDisconnectionHandlers(ws: WebSocket, clientId: string) {
  ws.on("close", () => {
    clientManager.removeClient(ws);
    // Broadcast updated stats to all connected UI clients
    broadcastStatsUpdate();
  });

  ws.on("error", (error: Error) => {
    logger.error(`WebSocket error for client ${clientId}: ${error.message}`, {
      clientId,
      error: error.message,
    });
    clientManager.removeClient(ws);
    // Broadcast updated stats to all connected UI clients
    broadcastStatsUpdate();
  });
}

// Cleanly close all WebSocket connections
export function closeAllConnections(wss: WebSocketServer): Promise<void> {
  return new Promise((resolve) => {
    logger.info("Closing all WebSocket connections...");
    wss.clients.forEach((client) => {
      client.close();
    });
    wss.close(() => {
      logger.info("All WebSocket connections closed.");
      resolve();
    });
  });
}
