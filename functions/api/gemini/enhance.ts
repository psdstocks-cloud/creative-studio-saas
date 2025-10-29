import { errorResponse, handleOptions, jsonResponse } from '../../_lib/http';
import { requireUser, type SupabaseEnv } from '../../_lib/supabase';

interface EnvBindings extends SupabaseEnv {
  GEMINI_API_KEY?: string;
}

const SYSTEM_PROMPT = `You are a world-class prompt engineer for an advanced AI image generator.
Your task is to take a user's simple prompt and expand it into a rich, detailed, and evocative description.
Focus on cinematic lighting, dynamic composition, intricate details, textures, and a strong mood.
Produce only the final, enhanced prompt as a single block of text, without any conversational preamble or explanation.`;

const buildGeminiPayload = (prompt: string) => ({
  contents: [
    {
      role: 'user',
      parts: [
        {
          text: `Enhance this user prompt for an AI image generator to be more vivid and detailed. User prompt: "${prompt}"`,
        },
      ],
    },
  ],
  systemInstruction: {
    role: 'system',
    parts: [{ text: SYSTEM_PROMPT }],
  },
});

const extractText = (response: any): string | null => {
  const candidates = response?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return text || null;
};

export const onRequest = async ({ request, env }: { request: Request; env: EnvBindings }) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(request, 500, 'Server configuration error: GEMINI_API_KEY is missing.');
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse(request, 400, 'Request body must be valid JSON.');
  }

  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const isThinkingMode = Boolean(body?.isThinkingMode);

  if (!prompt) {
    return errorResponse(request, 400, 'Prompt is required.');
  }

  try {
    await requireUser(request, env);

    const model = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGeminiPayload(prompt)),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return errorResponse(
        request,
        response.status >= 400 && response.status < 600 ? response.status : 502,
        errorBody || response.statusText || 'Gemini API request failed.'
      );
    }

    const data = await response.json();
    const enhanced = extractText(data);

    if (!enhanced) {
      return errorResponse(request, 502, 'Gemini API did not return any content.');
    }

    return jsonResponse(request, 200, { enhancedPrompt: enhanced });
  } catch (error: any) {
    const message = error?.message || 'Unable to enhance prompt.';
    const status = /access token/i.test(message) ? 401 : 500;
    return errorResponse(request, status, message);
  }
};
