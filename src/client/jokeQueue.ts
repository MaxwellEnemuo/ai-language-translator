import { Joke } from "../common/types";
import getLogger from "../common/logger";
import { DEFAULT_RATE_LIMIT, getApiCallMinIntervalMs } from "./config";

const logger = getLogger("joke-queue");

export const createJokeQueue = (rateLimit: number = DEFAULT_RATE_LIMIT) => {
  // Private state
  const state = {
    queue: [] as Joke[],
    lastApiCallTime: 0,
    rateLimit,
    apiCallMinIntervalMs: getApiCallMinIntervalMs(rateLimit),
  };

  logger.info(
    { rateLimit, apiCallMinIntervalMs: state.apiCallMinIntervalMs },
    `Initialized joke queue with rate limit of ${rateLimit} requests per minute`
  );

  return {
    enqueue: (joke: Joke): void => {
      state.queue.push(joke);
      logger.info(
        { jokeId: joke.id, queueSize: state.queue.length },
        `Added joke ${joke.id} to queue. Current queue size: ${state.queue.length}`
      );
    },

    shouldProcessNext: (): boolean => {
      if (state.queue.length === 0) {
        return false;
      }

      const currentTime = Date.now();
      const timeSinceLastCall = currentTime - state.lastApiCallTime;
      const shouldProcess = timeSinceLastCall >= state.apiCallMinIntervalMs;

      if (!shouldProcess && state.queue.length > 0) {
        const waitTimeMs = state.apiCallMinIntervalMs - timeSinceLastCall;
        logger.debug(
          { waitTimeMs, queueSize: state.queue.length },
          `Rate limiting in effect. Next processing possible in ${waitTimeMs}ms`
        );
      }

      return shouldProcess;
    },

    dequeue: (): Joke | null => {
      if (state.queue.length === 0) {
        return null;
      }

      const joke = state.queue.shift() as Joke;
      state.lastApiCallTime = Date.now();

      logger.info(
        { jokeId: joke.id, queueSize: state.queue.length },
        `Dequeued joke ${joke.id}. Remaining queue size: ${state.queue.length}`
      );

      return joke;
    },

    clear: (): void => {
      const queueSize = state.queue.length;
      state.queue = [];
      logger.info(
        { clearedCount: queueSize },
        `Cleared joke queue of ${queueSize} items`
      );
    },

    resetRateLimit: (): void => {
      state.lastApiCallTime = 0;
      logger.info("Rate limit timer reset");
    },

    size: (): number => state.queue.length,
  };
};
