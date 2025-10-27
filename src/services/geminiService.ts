// FIX: Corrected import to use GoogleGenAI from @google/genai and not GoogleGenerativeAI from @google/generative-ai
import { GoogleGenAI } from "@google/genai";

// FIX: Initialized with named apiKey parameter as per guidelines
// The API key is sourced from process.env.API_KEY, which is defined in vite.config.ts
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enhancePrompt = async (prompt: string, isThinkingMode: boolean): Promise<string> => {
  // FIX: Updated to use recommended models, avoiding deprecated ones like gemini-1.5-flash
  const modelName = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  
  const systemInstruction = `You are a world-class prompt engineer for an advanced AI image generator.
Your task is to take a user's simple prompt and expand it into a rich, detailed, and evocative description.
Focus on cinematic lighting, dynamic composition, intricate details, textures, and a strong mood.
Produce only the final, enhanced prompt as a single block of text, without any conversational preamble or explanation.`;

  try {
    // FIX: Refactored to use the recommended ai.models.generateContent method, which is more direct.
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Enhance this user prompt for an AI image generator to be more vivid and detailed. User prompt: "${prompt}"`,
      config: {
        systemInstruction: systemInstruction
      }
    });
    
    // FIX: Correctly access the generated text using the .text property instead of response.text()
    return response.text.trim();
  } catch (error) {
    console.error("Error enhancing prompt with Gemini:", error);
    // Fallback to the original prompt on error
    return prompt;
  }
};
