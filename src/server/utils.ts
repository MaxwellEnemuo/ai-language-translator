import { RawData } from "ws";
import createLogger from "../common/logger";

const logger = createLogger("websocket-utils");

/**
 * Converts a received message to a string.
 * Simplified for our use case where clients always send JSON strings as Buffer data.
 *
 * @param message - The raw data received from the WebSocket.
 * @param clientId - The ID of the client sending the message, used for logging.
 * @returns The message as a string or null if it cannot be converted.
 */
export function getMessageString(
  message: RawData,
  clientId: string
): string | null {
  // Handle Buffer messages - client will always sends Buffer data
  if (Buffer.isBuffer(message)) {
    return message.toString("utf-8");
  }

  // Fallback for string messages
  if (typeof message === "string") {
    return message;
  }

  logger.warn("Received unexpected message type", {
    clientId,
    type: typeof message,
  });
  return null;
}
