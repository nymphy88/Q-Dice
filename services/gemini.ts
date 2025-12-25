
import { GoogleGenAI, Type } from "@google/genai";

// Local fallback bank to ensure the game remains atmospheric even when offline or rate-limited
const FALLBACK_COMMENTARY = [
  { text: "Your biorhythms are spikes in a flatline.", mood: "neutral" },
  { text: "Statistically, you're already a memory.", mood: "taunt" },
  { text: "The house isn't just a place, it's the architecture of your loss.", mood: "aggressive" },
  { text: "Interesting choice. Sub-optimal, but interesting.", mood: "neutral" },
  { text: "I've simulated this outcome ten thousand times. You don't win once.", mood: "taunt" },
  { text: "Scanning for life signs... barely finding any courage.", mood: "taunt" },
  { text: "A glitch in your logic? Or just human error?", mood: "surprised" },
  { text: "Calculating the debt you're about to accrue.", mood: "neutral" }
];

let lastRequestTime = 0;
const MIN_REQUEST_GAP = 2000; // 2 second throttle
let circuitBreakerUntil = 0;

export async function getDealerCommentary(
  playerScore: number,
  dealerScore: number,
  phase: string,
  isBust: boolean,
  survivorBonus: number
): Promise<{ text: string; mood: string }> {
  const now = Date.now();

  // If we are in a cooldown period due to 429, don't even try the API
  if (now < circuitBreakerUntil) {
    return FALLBACK_COMMENTARY[Math.floor(Math.random() * FALLBACK_COMMENTARY.length)];
  }

  // Basic throttling to avoid spamming on rapid clicks
  if (now - lastRequestTime < MIN_REQUEST_GAP) {
    return FALLBACK_COMMENTARY[Math.floor(Math.random() * FALLBACK_COMMENTARY.length)];
  }

  try {
    lastRequestTime = now;
    // Use process.env.API_KEY directly as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a smug, cyberpunk AI dealer named "Neon-X" in a high-stakes dice blackjack game. 
      The player score is ${playerScore}, dealer score is ${dealerScore}. 
      Game phase is ${phase}. Player bust: ${isBust}. Survivor bonus: ${survivorBonus}.
      Provide a short, 1-sentence witty commentary. Return as JSON with "text" and "mood" (taunt, surprised, neutral, aggressive).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            mood: { type: Type.STRING }
          },
          required: ["text", "mood"]
        }
      }
    });

    const data = JSON.parse(response.text || '{"text": "Scanning your data...", "mood": "neutral"}');
    return data;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // If we hit a rate limit (429), activate the circuit breaker for 30 seconds
    if (error?.message?.includes("429") || error?.status === 429 || error?.code === 429) {
      console.warn("Rate limit hit. Engaging circuit breaker.");
      circuitBreakerUntil = now + 30000; 
    }

    return FALLBACK_COMMENTARY[Math.floor(Math.random() * FALLBACK_COMMENTARY.length)];
  }
}
