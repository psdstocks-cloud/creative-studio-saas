
// ✅ CORRECT
import { GoogleGenerativeAI } from "@google/generative-ai";

// Assume process.env.API_KEY is configured in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const enhancePrompt = async (prompt: string, isThinkingMode: boolean): Promise<string> => {
  // Fix: Use 'gemini-2.5-flash' for basic text tasks as per coding guidelines.
  const modelName = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const systemInstruction = `You are a world-class prompt engineer for an advanced AI image generator.
    Your task is to take a user's simple prompt and expand it into a rich, detailed, and evocative description.
    Focus on cinematic lighting, dynamic composition, intricate details, textures, and a strong mood.
    Produce only the final, enhanced prompt as a single block of text, without any conversational preamble or explanation.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        ...(isThinkingMode && { thinkingConfig: { thinkingBudget: 32768 } }),
      },
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error enhancing prompt with Gemini:", error);
    // Fallback to the original prompt on error
    return prompt;
  }
};