# AI Tutor Backend Technical Challenge - Node.js/TypeScript Implementation

## Rationale for Using Node.js/TypeScript

Node.js, especially with TypeScript, is highly suitable for this challenge due to its inherent strengths in handling asynchronous, I/O-bound operations and real-time communication. Its event-driven, non-blocking architecture is very much well-suited for WebSocket servers that need to manage multiple concurrent client connections efficiently, as required by the server. Also, Node.js has excellent and mature libraries for WebSockets (e.g., `ws`, `socket.io`)

## Implementation Overview

This project implements a real-time WebSocket-based joke translation system that significantly exceeds the basic challenge requirements. Here's what was achieved:

### Technical Implementation

* **Server Architecture**: Event-driven WebSocket server with client connection management
* **Client Architecture**: Solid queue-based processing with graceful shutdown handling. Rate-limited joke processing with configurable thresholds that automatically spaces API calls to prevent 429 errors
* **Translation Pipeline**: Async processing with proper error handling and retry mechanisms
* **Monitoring System**: Real-time statistics tracking and web-based visualization
* **Configuration Management**: Environment-based configuration with sensible defaults
* **Comprehensive Testing**: Unit tests for critical components using Jest

## How to Run with Docker

### Prerequisites

* Docker and Docker Compose installed on your system

### Setup

1. **Clone the repository**

2. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

3. **Edit the `.env` file and add your `GEMINI_API_KEY`:**

   ```env
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

   # Optional configurations
   GEMINI_MODEL=
   MAX_TRANSLATIONS=
   RPM_LIMIT=
   SEND_JOKE_INTERVAL=
   PORT=
   ```

   Get your Gemini API key here: <https://ai.google.dev/gemini-api/docs/api-key>
   The rest are optional and will default to their respective values if not provided.

### Running Options

#### Option 1: Run Server and Client Separately

**Start the Server (Terminal 1):**

```bash
docker compose run --rm server
```

**Start the Client (Terminal 2) Multiple client instances can be started:**

```bash
docker compose run --rm client
```

This approach allows you to:

* Monitor each component's logs separately with colorized output
* Start/stop components independently
* Run multiple client instances by running the client command multiple times

#### Option 2: Run Both Components Together

**Start both Server and Client with a single command:**

```bash
docker compose up --build
```

This will start both the server and client in the same terminal window with combined logs.

## External APIs Used

* **Google Gemini API:** Used by the Client to translate jokes into German. Specifically, the `gemini-2.0-flash` model is used by default.
* **Free Tier Rate Limit:** <https://ai.google.dev/gemini-api/docs/rate-limits#free-tier>

## Web UI

The project includes a real-time web dashboard that displays statistics about the WebSocket server and client connections:

* **How to Access:** Open `http://localhost:8080` in your browser after starting the server (with Docker or locally).
* **Features:**
  * Overall statistics
  * Real-time updates via Server-Sent Events (SSE)
  * Detailed information for each client connection
  * Connection status tracking (connected/disconnected)
  * Translation performance metrics

The UI automatically updates as clients connect, translate jokes, and disconnect from the WebSocket server.

## Testing

The project includes comprehensive unit tests for both client and server components:

* **Client Tests:**
  * `jokeQueue.test.ts` - Tests the joke queue functionality
  * `translationProcessor.test.ts` - Tests the translation processing pipeline

* **Server Tests:**
  * `clientManager.test.ts` - Tests client connection management and statistics
  * `wsHandler.test.ts` - Tests WebSocket server communication

Run tests with:

```bash
yarn test
```
