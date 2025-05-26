import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupWebSocketServer, closeAllConnections } from "../wsHandler";
import clientManager from "../clientManager";
import { broadcastStatsUpdate } from "../sseHandler";

// Mock modules
jest.mock("ws");
jest.mock("../clientManager", () => ({
  getWebSocketClientId: jest.fn().mockReturnValue("test-client-id"),
  addClient: jest.fn(),
  incrementJokesSent: jest.fn(),
  incrementTranslationsReceived: jest.fn(),
  removeClient: jest.fn(),
}));

// Mock the SSE handler
jest.mock("../sseHandler", () => ({
  broadcastStatsUpdate: jest.fn(),
}));

describe("WebSocket Handler", () => {
  // Setup mocks
  let mockServer: http.Server;
  let mockWss: any;
  let mockWs: any;
  let connectionHandler: (ws: WebSocket, req: http.IncomingMessage) => void;
  let messageHandler: (data: Buffer) => void;
  let closeHandler: () => void;

  beforeEach(() => {
    // Setup jest timer mocks
    jest.useFakeTimers();

    // Clear mocks
    jest.clearAllMocks();

    // Mock HTTP server
    mockServer = new http.Server();

    // Mock WebSocketServer implementation
    (
      WebSocketServer as jest.MockedClass<typeof WebSocketServer>
    ).mockImplementation(() => {
      mockWss = {
        on: jest.fn((event: string, handler: any) => {
          if (event === "connection") {
            connectionHandler = handler;
          }
        }),
        clients: new Set<WebSocket>(),
        close: jest.fn((callback: () => void) => callback()),
      };
      return mockWss;
    });

    // Mock WebSocket implementation
    mockWs = {
      on: jest.fn((event: string, handler: any) => {
        if (event === "message") messageHandler = handler;
        if (event === "close") closeHandler = handler;
        // We don't need to store the error handler since we don't directly test it
      }),
      send: jest.fn(),
      readyState: WebSocket.OPEN,
      close: jest.fn(),
    };

    // Setup WebSocket Server
    setupWebSocketServer(mockServer);
  });

  // Test 1: Connection handling
  test("should handle new WebSocket connections correctly", () => {
    // Simulate connection
    const req = {} as http.IncomingMessage;
    connectionHandler(mockWs, req);

    // Verify client ID was requested
    expect(clientManager.getWebSocketClientId).toHaveBeenCalledWith(
      mockWs,
      req
    );

    // Verify client was added with interval
    expect(clientManager.addClient).toHaveBeenCalledWith(
      mockWs,
      "test-client-id",
      expect.any(Object) // The interval ID
    );

    // Verify event listeners were set up
    expect(mockWs.on).toHaveBeenCalledWith("message", expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith("close", expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith("error", expect.any(Function));

    // Verify joke sending is triggered after connection
    // We need to fast forward the timer to trigger the first joke send
    jest.advanceTimersByTime(200); // The default SEND_JOKE_INTERVAL

    // Check a joke was sent
    expect(mockWs.send).toHaveBeenCalledTimes(1);
    expect(clientManager.incrementJokesSent).toHaveBeenCalledWith(mockWs);

    // Verify that stats update was broadcast
    expect(broadcastStatsUpdate).toHaveBeenCalled();
  });

  // Test 2: Message handling
  test("should handle incoming messages (translated jokes) correctly", () => {
    // Simulate connection first
    connectionHandler(mockWs, {} as http.IncomingMessage);

    // Create a message payload (translated joke)
    const translatedJoke = {
      id: 123,
      translated_joke: "Translated test joke",
      translationDurationMs: 100,
    };

    // Convert to buffer as it would be in real WebSocket
    const messageBuffer = Buffer.from(JSON.stringify(translatedJoke));

    // Simulate receiving message
    messageHandler(messageBuffer);

    // Verify the client manager was updated with the translation
    expect(clientManager.incrementTranslationsReceived).toHaveBeenCalledWith(
      mockWs,
      translatedJoke.translationDurationMs
    );

    // Verify that stats update was broadcast
    expect(broadcastStatsUpdate).toHaveBeenCalled();
  });

  // Bonus Test 3: Disconnection handling
  test("should handle disconnections correctly", () => {
    // Simulate connection first
    connectionHandler(mockWs, {} as http.IncomingMessage);

    // Clear mocks before disconnection to isolate the disconnect events
    jest.clearAllMocks();

    // Simulate disconnection
    closeHandler();

    // Verify client was removed
    expect(clientManager.removeClient).toHaveBeenCalledWith(mockWs);

    // Verify that stats update was broadcast on disconnect
    expect(broadcastStatsUpdate).toHaveBeenCalled();
  });

  // Bonus Test 4: Closing all connections
  test("should close all connections when requested", async () => {
    // Add a client to the WSS clients set
    mockWss.clients.add(mockWs);

    // Close all connections
    await closeAllConnections(mockWss);

    // Verify client was closed
    expect(mockWs.close).toHaveBeenCalled();

    // Verify server was closed
    expect(mockWss.close).toHaveBeenCalled();
  });

  // Test 5: Error handling during joke sending
  test("should handle errors during joke sending", () => {
    connectionHandler(mockWs, {} as http.IncomingMessage);

    // Clear mocks before error test
    jest.clearAllMocks();

    // Simulate an error when sending a joke
    mockWs.send.mockImplementationOnce(() => {
      throw new Error("Failed to send joke");
    });

    // Advance timer to trigger joke sending
    jest.advanceTimersByTime(200);

    // The error should be caught and not crash the app
    // The joke sending counter should not be incremented on error
    expect(clientManager.incrementJokesSent).not.toHaveBeenCalled();
  });

  // Test 6: Error handling for malformed messages
  test("should handle malformed message data", () => {
    connectionHandler(mockWs, {} as http.IncomingMessage);

    // Send malformed JSON
    const malformedMessage = Buffer.from("not valid json");

    // Simulate receiving message
    messageHandler(malformedMessage);

    // Verify translation counter was not incremented
    expect(clientManager.incrementTranslationsReceived).not.toHaveBeenCalled();
  });

  // Cleanup fake timers
  afterEach(() => {
    jest.useRealTimers();
  });
});
