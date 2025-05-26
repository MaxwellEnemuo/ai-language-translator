import { createTranslationProcessor } from "../translationProcessor";
import { Joke } from "../../common/types";

// Mock the translation service
jest.mock("../translationService", () => ({
  translateJoke: jest.fn().mockImplementation((joke) => {
    return Promise.resolve(`TRANSLATED: ${joke}`);
  }),
}));

// Mock the MAX_TRANSLATIONS config
jest.mock("../config", () => ({
  MAX_TRANSLATIONS: 10,
}));

describe("Translation Processor", () => {
  // Test 1: Successfully translate jokes
  test("should process and emit translations for jokes", async () => {
    // Create translation processor
    const processor = createTranslationProcessor();

    // Setup spies
    const translatedSpy = jest.fn();

    processor.on("translated", translatedSpy);

    // Process a joke
    const mockJoke: Joke = {
      id: 1,
      joke: "Why did the chicken cross the road?",
    };
    await processor.processJoke(mockJoke);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Check the translation was emitted
    expect(translatedSpy).toHaveBeenCalledTimes(1);
    expect(translatedSpy).toHaveBeenCalledWith({
      id: 1,
      joke: "Why did the chicken cross the road?",
      translated_joke: "TRANSLATED: Why did the chicken cross the road?",
      translationDurationMs: expect.any(Number),
    });

    // Check the translation count
    expect(processor.translationsCount()).toBe(1);
  });

  // Test 2: Handle translation errors
  test("should handle translation errors properly", async () => {
    // Create translation processor
    const processor = createTranslationProcessor();

    // Setup spies
    const translatedSpy = jest.fn();
    const completedSpy = jest.fn();

    processor.on("translated", translatedSpy);
    processor.on("completed", completedSpy);

    // Mock translation service to fail
    require("../translationService").translateJoke.mockImplementationOnce(
      () => {
        return Promise.reject(new Error("Translation API error"));
      }
    );

    // Process a joke that will fail
    const mockJoke = { id: 2, joke: "Failed joke" };
    await processor.processJoke(mockJoke);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    // No translation should have been emitted
    expect(translatedSpy).not.toHaveBeenCalled();

    // Translation count should remain at 0
    expect(processor.translationsCount()).toBe(0);

    // Reset method should work
    processor.reset();
    expect(processor.translationsCount()).toBe(0);

    // Test the active count method
    expect(processor.activeCount()).toBe(0);

    // Test the isCompleted method
    expect(processor.isCompleted()).toBe(false);
  });
});
