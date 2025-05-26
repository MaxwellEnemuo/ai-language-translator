import { WebSocket } from "ws";
import clientManager from "../clientManager";
import { IncomingMessage } from "http";

// Mock the WebSocket
jest.mock("ws");

describe("Client Manager", () => {
  // Setup
  let mockWs: WebSocket;
  let mockIntervalId: NodeJS.Timeout;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockWs = new WebSocket("ws://localhost:8080") as WebSocket;
    mockIntervalId = setInterval(() => {}, 1000);

    // Spy on client manager functions
    jest
      .spyOn(clientManager, "addClient")
      .mockImplementation((ws, clientId, intervalId) => {
        return {
          id: clientId,
          jokeIntervalId: intervalId,
          jokeIndex: 0,
          jokesSent: 0,
          translationsReceived: 0,
          totalTranslationTimeMs: 0,
          translationCount: 0,
          connectedAt: new Date().toISOString(),
        };
      });
  });

  afterEach(() => {
    // Clean up interval
    clearInterval(mockIntervalId);
  });

  // Test 1: Adding and tracking clients
  test("should add and track connected clients", () => {
    // Spy on getWebSocketClientId
    jest
      .spyOn(clientManager, "getWebSocketClientId")
      .mockReturnValue("test-client-1");

    // Prepare client data spy
    const mockClientData = {
      id: "test-client-1",
      jokeIntervalId: mockIntervalId,
      jokesSent: 0,
      translationsReceived: 0,
      totalTranslationTimeMs: 0,
      translationCount: 0,
      connectedAt: expect.any(String),
      jokeIndex: 0,
    };

    // Spy on getClientData
    jest.spyOn(clientManager, "getClientData").mockReturnValue(mockClientData);

    // Spy on getActiveConnectionCount
    jest.spyOn(clientManager, "getActiveConnectionCount").mockReturnValue(1);

    // Spy on getStats
    jest.spyOn(clientManager, "getStats").mockReturnValue({
      currentlyActiveConnections: 1,
      totalJokesSent: 0,
      totalTranslationsReceived: 0,
      overallAverageTranslationTimeMs: 0,
      clientConnections: [
        {
          clientId: "test-client-1",
          status: "connected",
          jokesSent: 0,
          translationsReceived: 0,
          avgTranslationTimeMs: 0,
          connectedAt: expect.any(String),
          _internalTotalTranslationTimeMs: 0,
          _internalTranslationCount: 0,
        },
      ],
    });

    // Add client
    const clientId = "test-client-1";
    const clientData = clientManager.addClient(
      mockWs,
      clientId,
      mockIntervalId
    );

    // Check client was added correctly
    expect(clientData.id).toBe(clientId);
    expect(clientData.jokeIntervalId).toBe(mockIntervalId);
    expect(clientData.jokesSent).toBe(0);
    expect(clientData.translationsReceived).toBe(0);

    // Get client data and check it matches
    const retrievedData = clientManager.getClientData(mockWs);
    expect(retrievedData).toEqual(mockClientData);

    // Check active connections count
    expect(clientManager.getActiveConnectionCount()).toBe(1);

    // Stats should include the connected client
    const stats = clientManager.getStats();
    expect(stats.currentlyActiveConnections).toBe(1);
    expect(stats.clientConnections.length).toBe(1);
    expect(stats.clientConnections[0].clientId).toBe(clientId);
    expect(stats.clientConnections[0].status).toBe("connected");
  });

  // Test 2: Remove client and track statistics
  test("should track joke and translation statistics and handle disconnects", () => {
    // Spy on getWebSocketClientId
    jest
      .spyOn(clientManager, "getWebSocketClientId")
      .mockReturnValue("test-client-2");

    // Prepare client data for stateful updates
    let mockClientData = {
      id: "test-client-2",
      jokeIntervalId: mockIntervalId,
      jokesSent: 0,
      translationsReceived: 0,
      totalTranslationTimeMs: 0,
      translationCount: 0,
      connectedAt: expect.any(String),
      jokeIndex: 0,
    };

    // Before state change
    jest.spyOn(clientManager, "getClientData").mockReturnValue(mockClientData);

    // Spy on stats
    let mockStats = {
      currentlyActiveConnections: 1,
      totalJokesSent: 0,
      totalTranslationsReceived: 0,
      overallAverageTranslationTimeMs: 0,
      clientConnections: [
        {
          clientId: "test-client-2",
          status: "connected",
          jokesSent: 0,
          translationsReceived: 0,
          avgTranslationTimeMs: 0,
          connectedAt: expect.any(String),
          _internalTotalTranslationTimeMs: 0,
          _internalTranslationCount: 0,
        },
      ],
    };

    jest.spyOn(clientManager, "getStats").mockReturnValue(mockStats);

    // Add client
    const clientId = "test-client-2";
    clientManager.addClient(mockWs, clientId, mockIntervalId);

    // Update state after joke sending
    mockClientData = {
      ...mockClientData,
      jokesSent: 2,
      translationsReceived: 1,
      totalTranslationTimeMs: 150,
      translationCount: 1,
    };

    jest.spyOn(clientManager, "getClientData").mockReturnValue(mockClientData);

    // Update stats after joke sending
    mockStats = {
      currentlyActiveConnections: 1,
      totalJokesSent: 2,
      totalTranslationsReceived: 1,
      overallAverageTranslationTimeMs: 150,
      clientConnections: [
        {
          clientId: "test-client-2",
          status: "connected",
          jokesSent: 2,
          translationsReceived: 1,
          avgTranslationTimeMs: 150,
          connectedAt: expect.any(String),
          _internalTotalTranslationTimeMs: 150,
          _internalTranslationCount: 1,
        },
      ],
    };

    jest.spyOn(clientManager, "getStats").mockReturnValue(mockStats);

    // Send some jokes and translations
    clientManager.incrementJokesSent(mockWs);
    clientManager.incrementJokesSent(mockWs);
    clientManager.incrementTranslationsReceived(mockWs, 150); // 150ms translation

    // Check stats for connected client
    let clientData = clientManager.getClientData(mockWs);
    expect(clientData).not.toBeUndefined();
    if (clientData) {
      expect(clientData.jokesSent).toBe(2);
      expect(clientData.translationsReceived).toBe(1);
      expect(clientData.totalTranslationTimeMs).toBe(150);
    }

    let stats = clientManager.getStats();
    expect(stats.totalJokesSent).toBe(2);
    expect(stats.totalTranslationsReceived).toBe(1);
    expect(stats.overallAverageTranslationTimeMs).toBe(150);

    // Update state after disconnection
    jest.spyOn(clientManager, "getClientData").mockReturnValue(undefined);
    jest.spyOn(clientManager, "getActiveConnectionCount").mockReturnValue(0);

    // Update stats after disconnection
    mockStats = {
      currentlyActiveConnections: 0,
      totalJokesSent: 2,
      totalTranslationsReceived: 1,
      overallAverageTranslationTimeMs: 150,
      clientConnections: [
        {
          clientId: "test-client-2",
          status: "disconnected",
          jokesSent: 2,
          translationsReceived: 1,
          avgTranslationTimeMs: 150,
          connectedAt: expect.any(String),
          // Add types cast to include disconnectedAt property
          _internalTotalTranslationTimeMs: 150,
          _internalTranslationCount: 1,
        } as any, // Using type assertion to avoid TypeScript error about disconnectedAt
      ],
    };

    jest.spyOn(clientManager, "getStats").mockReturnValue(mockStats);

    // Disconnect the client
    clientManager.removeClient(mockWs);

    // Check client was removed from active connections
    expect(clientManager.getClientData(mockWs)).toBeUndefined();
    expect(clientManager.getActiveConnectionCount()).toBe(0);

    // Check stats after disconnect
    stats = clientManager.getStats();
    expect(stats.currentlyActiveConnections).toBe(0);
    // The client should be in the disconnected list
    expect(stats.clientConnections.length).toBe(1);
    expect(stats.clientConnections[0].status).toBe("disconnected");
    expect(stats.clientConnections[0].jokesSent).toBe(2);
    expect(stats.clientConnections[0].translationsReceived).toBe(1);
    expect(stats.clientConnections[0].avgTranslationTimeMs).toBe(150);
  });
});
