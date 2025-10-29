import { apiFetch } from './api';
import type { AiJob } from '../types';

interface CreateJobResponse {
  success: boolean;
  job_id: string;
  get_result_url: string;
}

/**
 * Creates a new AI image generation job.
 * @param prompt The text prompt for the image generation.
 * @returns A promise resolving to the new job's details.
 */
export const createAiJob = async (prompt: string): Promise<CreateJobResponse> => {
  // This API uses a non-standard GET request and expects data in the query string.
  // The shared apiFetch utility handles converting the body to query params.
  return apiFetch('/aig/create', {
    method: 'GET',
    body: { prompt },
  });
};

/**
 * Polls the result URL to get the status of an AI job.
 * @param getResultUrl The full URL provided by the `createAiJob` call.
 * @returns A promise resolving to the full AIJob object.
 */
export const pollAiJob = async (getResultUrl: string): Promise<AiJob> => {
  const url = new URL(getResultUrl);
  const endpoint = `${url.pathname.replace(/^\/api/, '')}${url.search}`;

  const data = await apiFetch(endpoint || '/', {
    method: 'GET',
    timeout: 15000,
  });

  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    throw new Error((data as { message?: string }).message || 'Polling request returned an error.');
  }

  return data as AiJob;
};

/**
 * Performs an action (vary or upscale) on a completed AI job's image.
 * @param jobId The ID of the parent job.
 * @param action The action to perform ('vary' or 'upscale').
 * @param index The index of the image within the parent job's files.
 * @returns A promise resolving to the new variation/upscale job's details.
 */
export const performAiAction = async (
  jobId: string,
  action: 'vary' | 'upscale',
  index: number
): Promise<CreateJobResponse> => {
  // This API also uses a non-standard GET request with query params.
  return apiFetch('/aig/actions', {
    method: 'GET',
    body: { job_id: jobId, action, index },
  });
};
