import { apiFetch } from './api';

export const enhancePrompt = async (prompt: string, isThinkingMode: boolean): Promise<string> => {
  try {
    const data = await apiFetch('/gemini/enhance', {
      method: 'POST',
      auth: true,
      body: { prompt, isThinkingMode },
    });

    if (!data || typeof data !== 'object') {
      throw new Error('Unexpected response from prompt enhancer.');
    }

    const enhanced = (data as { enhancedPrompt?: string }).enhancedPrompt;
    return enhanced?.trim() || prompt;
  } catch (error) {
    console.error('Error enhancing prompt with Gemini:', error);
    return prompt;
  }
};
