// ✅ CORRECT import
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize with API key from environment
const genAI = new GoogleGenerativeAI(process.env.API_KEY || '');

export const enhancePrompt = async (prompt: string, isThinkingMode: boolean): Promise<string> => {
  // Use appropriate model based on thinking mode
  const modelName = isThinkingMode ? 'gemini-2.0-flash-thinking-exp' : 'gemini-1.5-flash';
  
  const systemInstruction = `You are a world-class prompt engineer for an advanced AI image generator.
Your task is to take a user's simple prompt and expand it into a rich, detailed, and evocative description.
Focus on cinematic lighting, dynamic composition, intricate details, textures, and a strong mood.
Produce only the final, enhanced prompt as a single block of text, without any conversational preamble or explanation.`;

  try {
    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemInstruction
    });

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();
  } catch (error) {
    console.error("Error enhancing prompt with Gemini:", error);
    // Fallback to the original prompt on error
    return prompt;
  }
};

// Export default for convenience
export default { enhancePrompt };
