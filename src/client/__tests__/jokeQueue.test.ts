import { createJokeQueue } from "../jokeQueue";

// Set up jest fake timers
jest.useFakeTimers();

describe("Joke Queue", () => {
  // Test 1: Test joke queue creation and basic functionality
  test("should create a joke queue with basic functionality", () => {
    // Create the joke queue
    const jokeQueue = createJokeQueue(10);

    // Add multiple jokes to the queue
    jokeQueue.enqueue({ id: 1, joke: "Test joke 1" });
    jokeQueue.enqueue({ id: 2, joke: "Test joke 2" });

    // Initial state - queue should have 2 items
    expect(jokeQueue.size()).toBe(2);

    // Process the first joke
    const joke1 = jokeQueue.dequeue();
    expect(joke1).toEqual({ id: 1, joke: "Test joke 1" });

    // Queue should now have 1 item
    expect(jokeQueue.size()).toBe(1);

    // Process the second joke
    const joke2 = jokeQueue.dequeue();
    expect(joke2).toEqual({ id: 2, joke: "Test joke 2" });

    // Queue should now be empty
    expect(jokeQueue.size()).toBe(0);
  });

  // Test 2: Test queue clear functionality
  test("should clear all jokes from the queue", () => {
    // Create the joke queue
    const jokeQueue = createJokeQueue(10);

    // Add jokes to the queue
    jokeQueue.enqueue({ id: 1, joke: "Test joke 1" });
    jokeQueue.enqueue({ id: 2, joke: "Test joke 2" });
    jokeQueue.enqueue({ id: 3, joke: "Test joke 3" });

    // Initial size check
    expect(jokeQueue.size()).toBe(3);

    // Clear the queue
    jokeQueue.clear();

    // Queue should now be empty
    expect(jokeQueue.size()).toBe(0);
  });
});
