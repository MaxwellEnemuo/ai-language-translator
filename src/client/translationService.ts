import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import getLogger from "../common/logger";

const logger = getLogger("translation-service");

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash"; 

if (!GEMINI_API_KEY) {
  logger.error(
    "GEMINI_API_KEY is not set. Please ensure it's available in your .env file or environment variables."
  );
  throw new Error(
    "GEMINI_API_KEY is not set. Please ensure it's available in your .env file or environment variables."
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
});

export async function translateJoke(
  jokeText: string,
  targetLanguage: string = "German"
): Promise<string | null> {
  if (!jokeText) {
    logger.warn("translateJoke called with empty text.");
    return null;
  }

  try {
    const prompt = `Translate the following English joke to ${targetLanguage}. Only return the translated joke text, nothing else, no explanations needed:\n\nJoke: "${jokeText}"\n\nTranslated Joke:`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    if (result.response) {
      const translatedText =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (translatedText) {
        logger.info(
          `Original: "${jokeText}" -> Translated: "${translatedText}"`
        );
        return translatedText;
      } else {
        logger.warn(
          "No translated text found in Gemini response for:",
          jokeText,
          JSON.stringify(result.response, null, 2)
        );
        const blockReason = result.response.promptFeedback?.blockReason;
        if (blockReason) {
          logger.warn(
            `Translation may have been blocked. Reason: ${blockReason}`
          );
          logger.warn(
            "Block reason details:",
            result.response.promptFeedback?.blockReasonMessage
          );
          logger.warn(
            "Safety ratings:",
            result.response.promptFeedback?.safetyRatings
          );
        }
        return `(Translation not available - ${
          blockReason ?? "empty response"
        })`;
      }
    } else {
      logger.error(
        "Error translating joke: No response object from Gemini for:",
        jokeText
      );
      return "(Translation failed - no response)";
    }
  } catch (error) {
    logger.error(
      { err: error, originalJoke: jokeText },
      "Error translating joke using Gemini API"
    );
    return "(Translation error)";
  }
}
