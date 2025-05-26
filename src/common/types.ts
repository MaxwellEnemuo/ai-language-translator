export interface Joke {
  id: number;
  joke: string;
}

export interface TranslatedJoke extends Joke {
  translated_joke: string;
  translationDurationMs?: number;
}

export interface ClientSessionData {
  clientId: string;
  status: "connected" | "disconnected";
  jokesSent: number;
  translationsReceived: number;
  avgTranslationTimeMs: number;
  connectedAt: string;
  disconnectedAt?: string;
  _internalTotalTranslationTimeMs: number;
  _internalTranslationCount: number;
}

export interface UiStatsPayload {
  totalJokesSent: number;
  totalTranslationsReceived: number;
  currentlyActiveConnections: number;
  overallAverageTranslationTimeMs: number;
  clientConnections: ClientSessionData[];
}
