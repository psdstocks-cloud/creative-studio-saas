// FIX: Corrected import to use GoogleGenAI from @google/genai and not GoogleGenerativeAI from @google/generative-ai
import { GoogleGenAI } from "@google/genai";

// FIX: Lazy initialization to prevent crashes when API key is missing
// The API key is sourced from environment variables
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not configured');
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const enhancePrompt = async (prompt: string, isThinkingMode: boolean): Promise<string> => {
  const aiInstance = getAI();
  
  // If API is not configured, return the original prompt
  if (!aiInstance) {
    console.warn('Gemini API not available, returning original prompt');
    return prompt;
  }
  
  // FIX: Updated to use recommended models, avoiding deprecated ones like gemini-1.5-flash
  const modelName = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  
  const systemInstruction = `You are a world-class prompt engineer for an advanced AI image generator.
Your task is to take a user's simple prompt and expand it into a rich, detailed, and evocative description.
Focus on cinematic lighting, dynamic composition, intricate details, textures, and a strong mood.
Produce only the final, enhanced prompt as a single block of text, without any conversational preamble or explanation.`;

  try {
    // FIX: Refactored to use the recommended ai.models.generateContent method, which is more direct.
    const response = await aiInstance.models.generateContent({
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
