
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export async function getDealerCommentary(
  playerScore: number,
  dealerScore: number,
  phase: string,
  isBust: boolean,
  survivorBonus: number
): Promise<{ text: string; mood: string }> {
  try {
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

    const data = JSON.parse(response.text || '{"text": "Place your bet, human.", "mood": "neutral"}');
    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "The house always wins, kid.", mood: "taunt" };
  }
}
