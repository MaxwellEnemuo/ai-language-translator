import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { ClientSessionData } from "../common/types";
import createLogger from "../common/logger";

const logger = createLogger("client-manager");

const MAX_DISCONNECTED_CLIENTS = 10;

// Client tracking data structures
interface ClientData {
  id: string;
  jokeIntervalId: NodeJS.Timeout;
  jokeIndex: number;
  jokesSent: number;
  translationsReceived: number;
  totalTranslationTimeMs: number;
  translationCount: number;
  connectedAt: string; // ISO string
}

// ClientManager interface defining the public API
interface ClientManager {
  getWebSocketClientId: (ws: WebSocket, req?: IncomingMessage) => string;
  addClient: (
    ws: WebSocket,
    clientId: string,
    jokeIntervalId: NodeJS.Timeout
  ) => ClientData;
  getClientData: (ws: WebSocket) => ClientData | undefined;
  incrementJokesSent: (ws: WebSocket) => void;
  incrementTranslationsReceived: (
    ws: WebSocket,
    translationDurationMs?: number
  ) => void;
  removeClient: (ws: WebSocket) => void;
  getStats: () => any;
  getActiveConnectionCount: () => number;
  cleanupAllConnections: () => void;
}

// Create the client manager with private state
const createClientManager = (): ClientManager => {
  const clientConnections = new Map<WebSocket, ClientData>();
  const recentlyDisconnectedClients: ClientSessionData[] = [];
  let nextClientId = 1;
  let globalTotalJokesSent = 0;
  let globalTotalTranslationsReceived = 0;
  let globalSumOfTranslationDurations = 0;
  let globalTranslationCount = 0;

  // Helper to get client ID from request or WebSocket
  const getWebSocketClientId = (
    ws: WebSocket,
    req?: IncomingMessage
  ): string => {
    const remoteAddress =
      req?.socket?.remoteAddress ?? (ws as any)._socket?.remoteAddress;
    const remotePort =
      req?.socket?.remotePort ?? (ws as any)._socket?.remotePort;
    if (remoteAddress && remotePort) {
      return `${remoteAddress}:${remotePort}`;
    }
    // Fallback if IP/Port not available
    return `client-${nextClientId++}`;
  };

  // Add a new client
  const addClient = (
    ws: WebSocket,
    clientId: string,
    jokeIntervalId: NodeJS.Timeout
  ): ClientData => {
    const now = new Date().toISOString();

    const clientData: ClientData = {
      id: clientId,
      jokeIntervalId,
      jokeIndex: 0,
      jokesSent: 0,
      translationsReceived: 0,
      totalTranslationTimeMs: 0,
      translationCount: 0,
      connectedAt: now,
    };

    clientConnections.set(ws, clientData);
    return clientData;
  };

  // Get client data for a websocket connection
  const getClientData = (ws: WebSocket): ClientData | undefined => {
    return clientConnections.get(ws);
  };

  // Update client statistics after sending a joke
  const incrementJokesSent = (ws: WebSocket): void => {
    const clientData = clientConnections.get(ws);
    if (clientData) {
      clientData.jokesSent++;
      globalTotalJokesSent++;
    }
  };

  // Update client statistics after receiving a translation
  const incrementTranslationsReceived = (
    ws: WebSocket,
    translationDurationMs?: number
  ): void => {
    const clientData = clientConnections.get(ws);
    if (clientData) {
      clientData.translationsReceived++;
      globalTotalTranslationsReceived++;

      if (translationDurationMs !== undefined) {
        clientData.totalTranslationTimeMs += translationDurationMs;
        clientData.translationCount++;
        globalSumOfTranslationDurations += translationDurationMs;
        globalTranslationCount++;
      }
    }
  };

  // Remove client and add to disconnected list
  const removeClient = (ws: WebSocket): void => {
    const clientData = clientConnections.get(ws);
    if (clientData) {
      clearInterval(clientData.jokeIntervalId);

      // Create disconnected client record
      const disconnectedClient: ClientSessionData = {
        clientId: clientData.id,
        status: "disconnected",
        jokesSent: clientData.jokesSent,
        translationsReceived: clientData.translationsReceived,
        avgTranslationTimeMs:
          clientData.translationCount > 0
            ? Math.round(
                (clientData.totalTranslationTimeMs /
                  clientData.translationCount) *
                  100
              ) / 100
            : 0,
        connectedAt: clientData.connectedAt,
        disconnectedAt: new Date().toISOString(),
        _internalTotalTranslationTimeMs: clientData.totalTranslationTimeMs,
        _internalTranslationCount: clientData.translationCount,
      };

      // Add to recently disconnected and maintain maximum size
      recentlyDisconnectedClients.unshift(disconnectedClient);
      if (recentlyDisconnectedClients.length > MAX_DISCONNECTED_CLIENTS) {
        recentlyDisconnectedClients.pop();
      }

      clientConnections.delete(ws);
      logger.info(`Client disconnected: ${clientData.id}`);
    }
  };

  // Get statistics for UI
  const getStats = () => {
    const activeClients: ClientSessionData[] = Array.from(
      clientConnections.entries()
    ).map(([_, data]) => ({
      clientId: data.id,
      status: "connected",
      jokesSent: data.jokesSent,
      translationsReceived: data.translationsReceived,
      avgTranslationTimeMs:
        data.translationCount > 0
          ? Math.round(
              (data.totalTranslationTimeMs / data.translationCount) * 100
            ) / 100
          : 0,
      connectedAt: data.connectedAt,
      _internalTotalTranslationTimeMs: data.totalTranslationTimeMs,
      _internalTranslationCount: data.translationCount,
    }));

    return {
      totalJokesSent: globalTotalJokesSent,
      totalTranslationsReceived: globalTotalTranslationsReceived,
      currentlyActiveConnections: clientConnections.size,
      overallAverageTranslationTimeMs:
        globalTranslationCount > 0
          ? Math.round(
              (globalSumOfTranslationDurations / globalTranslationCount) * 100
            ) / 100
          : 0,
      clientConnections: [...activeClients, ...recentlyDisconnectedClients],
    };
  };

  // Get current number of active connections
  const getActiveConnectionCount = (): number => {
    return clientConnections.size;
  };

  // Clean up all client connections (for server shutdown)
  const cleanupAllConnections = () => {
    clientConnections.forEach((clientData, ws) => {
      clearInterval(clientData.jokeIntervalId);
    });
    clientConnections.clear();
  };

  // Return public interface
  return {
    getWebSocketClientId,
    addClient,
    getClientData,
    incrementJokesSent,
    incrementTranslationsReceived,
    removeClient,
    getStats,
    getActiveConnectionCount,
    cleanupAllConnections,
  };
};

// Create and export a singleton instance
export default createClientManager();
