import dotenv from "dotenv";

dotenv.config();

// WebSocket server configuration
export const SERVER_URL = process.env.SERVER_URL ?? "ws://localhost:8080";

// Translation limits
export const MAX_TRANSLATIONS = 5;

// API Rate limiting
export const DEFAULT_RATE_LIMIT = process.env.RATE_LIMIT
  ? Number(process.env.RATE_LIMIT)
  : 15; // This will match Gemini API free tier limit - https://ai.google.dev/gemini-api/docs/rate-limits#free-tier

export const getApiCallMinIntervalMs = (rateLimit: number) => 60000 / rateLimit; // 15 RPM = 1 call every 4000ms
