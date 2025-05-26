// Translation processor module
import { EventEmitter } from "events";
import { Joke, TranslatedJoke } from "../common/types";
import { translateJoke } from "./translationService";
import getLogger from "../common/logger";
import { MAX_TRANSLATIONS } from "./config";

const logger = getLogger("translation-processor");

export const createTranslationProcessor = () => {
  const state = {
    activeTranslations: new Set<Promise<void>>(),
    translatedCount: 0,
    emitter: new EventEmitter(),
  };

  return {
    on: (event: string, listener: (...args: any[]) => void) => {
      state.emitter.on(event, listener);
    },

    processJoke: async (joke: Joke): Promise<void> => {
      // Check if we've already reached the limit (completed translations)
      if (state.translatedCount >= MAX_TRANSLATIONS) {
        logger.info(
          { jokeId: joke.id, translatedCount: state.translatedCount },
          `Skipping joke ${joke.id}, already reached maximum translations (${MAX_TRANSLATIONS})`
        );
        return;
      }

      // Check if total (completed + in-progress) would exceed the limit
      const totalInProgress =
        state.translatedCount + state.activeTranslations.size;
      if (totalInProgress >= MAX_TRANSLATIONS) {
        logger.info(
          {
            jokeId: joke.id,
            translatedCount: state.translatedCount,
            activeTranslations: state.activeTranslations.size,
            totalInProgress,
          },
          `Skipping joke ${joke.id}, would exceed maximum translations (${MAX_TRANSLATIONS}). Total in progress: ${totalInProgress}`
        );
        return;
      }

      logger.info(
        { jokeId: joke.id, activeTranslations: state.activeTranslations.size },
        `Starting translation for joke ${joke.id}`
      );

      const translationPromise = (async () => {
        try {
          // Add timestamp for measuring translation duration
          const translationStartTime = performance.now();
          const germanTranslation = await translateJoke(joke.joke);
          const translationDurationMs = performance.now() - translationStartTime;

          if (germanTranslation) {
            const translatedJokePayload: TranslatedJoke = {
              id: joke.id,
              joke: joke.joke,
              translated_joke: germanTranslation,
              translationDurationMs: translationDurationMs,
            };

            logger.info(
              {
                translatedJoke: translatedJokePayload,
                durationMs: translationDurationMs,
              },
              `Translation completed for joke ${joke.id} in ${translationDurationMs}ms`
            );

            state.translatedCount++;
            state.emitter.emit("translated", translatedJokePayload);

            // Check if we've completed the required number of translations
            if (state.translatedCount >= MAX_TRANSLATIONS) {
              state.emitter.emit("completed");
            }
          } else {
            logger.warn(
              { jokeId: joke.id },
              `Translation failed for joke ${joke.id}: null result returned`
            );
          }
        } catch (error) {
          logger.error(
            { err: error, jokeId: joke.id },
            `Error translating joke ${joke.id}`
          );
        }
      })();

      state.activeTranslations.add(translationPromise);

      translationPromise.finally(() => {
        state.activeTranslations.delete(translationPromise);
        logger.debug(
          {
            jokeId: joke.id,
            activeRemaining: state.activeTranslations.size,
            translatedCount: state.translatedCount,
          },
          `Translation promise for joke ${joke.id} completed. ${state.activeTranslations.size} active translations remaining.`
        );

        // If this was the final translation and we've hit our quota
        if (
          state.activeTranslations.size === 0 &&
          state.translatedCount >= MAX_TRANSLATIONS
        ) {
          state.emitter.emit("completed");
        }
      });
    },

    activeCount: (): number => state.activeTranslations.size,

    isCompleted: (): boolean =>
      state.translatedCount >= MAX_TRANSLATIONS &&
      state.activeTranslations.size === 0,

    translationsCount: (): number => state.translatedCount,

    reset: (): void => {
      // Resets the counter
      state.translatedCount = 0;
      logger.info("Translation processor reset");
    },
  };
};
