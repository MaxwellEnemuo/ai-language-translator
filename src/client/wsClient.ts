// WebSocket client module
import WebSocket from "ws";
import { EventEmitter } from "events";
import { Joke, TranslatedJoke } from "../common/types";
import getLogger from "../common/logger";
import { SERVER_URL } from "./config";

const logger = getLogger("ws-client");

// Create WebSocket client with EventEmitter for event handling
export const createWebSocketClient = (serverUrl: string = SERVER_URL) => {
  const emitter = new EventEmitter();
  const ws = new WebSocket(serverUrl);

  logger.info({ serverUrl }, `Attempting to connect to server...`);

  // Set up event listeners
  ws.on("open", () => {
    logger.info("Connected to websocket server");
    emitter.emit("open");
  });

  ws.on("message", (data: WebSocket.Data) => {
    try {
      let messageString: string;

      if (Buffer.isBuffer(data)) {
        messageString = data.toString("utf-8");
      } else if (Array.isArray(data)) {
        messageString = Buffer.concat(data).toString("utf-8");
      } else if (data instanceof ArrayBuffer) {
        messageString = Buffer.from(data).toString("utf-8");
      } else {
        messageString = data.toString();
      }

      try {
        const parsed = JSON.parse(messageString);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "id" in parsed &&
          "joke" in parsed
        ) {
          const jokePayload = parsed as Joke;
          logger.info(
            { joke: jokePayload },
            `Received joke: ${jokePayload.id}`
          );
          emitter.emit("message", jokePayload);
        } else {
          logger.warn(
            { receivedData: messageString },
            `Received message is not a valid Joke object`
          );
        }
      } catch (e: unknown) {
        logger.warn(
          {
            originalMessage: messageString,
            error: e instanceof Error ? e.message : String(e),
          },
          `Received non-JSON message from server (will ignore)`
        );
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to process incoming message");
    }
  });

  ws.on("close", () => {
    logger.info("Disconnected from websocket server");
    emitter.emit("close");
  });

  ws.on("error", (error: Error) => {
    logger.error({ err: error }, "WebSocket error");
    emitter.emit("error", error);
  });

  // Return API functions
  return {
    on: (event: string, listener: (...args: any[]) => void) =>
      emitter.on(event, listener),

    sendTranslatedJoke: (translatedJoke: TranslatedJoke): boolean => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(translatedJoke));
          logger.info(
            { translatedJoke },
            `Sent translated joke: ${translatedJoke.id}`
          );
          return true;
        } catch (error) {
          logger.error(
            { err: error, joke: translatedJoke },
            "Failed to send translated joke"
          );
          return false;
        }
      } else {
        logger.warn(
          { joke: translatedJoke },
          "Cannot send translated joke: WebSocket not connected"
        );
        return false;
      }
    },

    close: (): void => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
        logger.info("Closing WebSocket connection");
      }
    },

    isConnected: (): boolean => ws.readyState === WebSocket.OPEN,
  };
};
