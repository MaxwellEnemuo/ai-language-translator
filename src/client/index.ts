// Main client entry point
import getLogger from "../common/logger";
import { createWebSocketClient } from "./wsClient";
import { createJokeQueue } from "./jokeQueue";
import { createTranslationProcessor } from "./translationProcessor";
import { MAX_TRANSLATIONS } from "./config";
import { Joke } from "../common/types";

const logger = getLogger("websocket-client");

// Initialize the components
const wsClient = createWebSocketClient();
const jokeQueue = createJokeQueue();
const translator = createTranslationProcessor();

// Main processing interval
let processingIntervalId: NodeJS.Timeout | null = null;

function checkAndProcessQueue(): void {
  // If all translations are done or client is disconnected, stop processing
  if (translator.isCompleted() || !wsClient.isConnected()) {
    if (translator.isCompleted() && wsClient.isConnected()) {
      logger.info(
        "All translations successfully sent and all processing complete. Disconnecting..."
      );
      cleanup();
      wsClient.close();
    }
    return;
  }

  // Check if we can process the next joke
  if (jokeQueue.shouldProcessNext()) {
    const nextJoke = jokeQueue.dequeue();
    if (nextJoke) {
      translator.processJoke(nextJoke).catch((err) => {
        logger.error({ err }, "Error in processing joke");
      });
    }
  }
}

// Cleanup function for graceful shutdown
function cleanup(): void {
  if (processingIntervalId) {
    clearInterval(processingIntervalId);
    processingIntervalId = null;
  }
  jokeQueue.clear();
}

// Event handlers
wsClient.on("open", () => {
  logger.info("WebSocket connection established, starting joke processing");
  jokeQueue.resetRateLimit();

  // Start the processing interval when connection is established
  if (processingIntervalId) clearInterval(processingIntervalId);
  processingIntervalId = setInterval(checkAndProcessQueue, 1000);
});

wsClient.on("message", (joke: Joke) => {
  // Only queue jokes if we haven't reached our translation goal
  if (translator.translationsCount() < MAX_TRANSLATIONS) {
    jokeQueue.enqueue(joke);
    // Try processing immediately
    checkAndProcessQueue();
  } else {
    logger.info(
      { jokeId: joke.id, maxTranslations: MAX_TRANSLATIONS },
      `Received joke ${joke.id} after MAX_TRANSLATIONS goal met or in progress. Ignoring.`
    );
  }
});

wsClient.on("close", () => {
  logger.info("WebSocket connection closed");
  cleanup();
});

wsClient.on("error", (error: Error) => {
  logger.error({ err: error }, "WebSocket error");
  cleanup();
});

translator.on("translated", (translatedJoke) => {
  wsClient.sendTranslatedJoke(translatedJoke);
  logger.info(
    { count: translator.translationsCount(), max: MAX_TRANSLATIONS },
    `Translated jokes sent: ${translator.translationsCount()}/${MAX_TRANSLATIONS}`
  );
});

translator.on("completed", () => {
  logger.info("All translations completed. Disconnecting...");
  cleanup();
  wsClient.close();
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT. Cleaning up...");
  cleanup();
  wsClient.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM. Cleaning up...");
  cleanup();
  wsClient.close();
  process.exit(0);
});
