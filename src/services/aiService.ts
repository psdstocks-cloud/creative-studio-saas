
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
    // This function uses native fetch because the URL is absolute and shouldn't
    // be prefixed with the API_BASE_URL from the shared apiFetch utility.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for polling

    try {
        const response = await fetch(getResultUrl, {
            // The API key is still required for the absolute URL endpoint.
            headers: { 'X-Api-Key': 'A8K9bV5s2OX12E8cmS4I96mtmSNzv7' },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Polling failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success === false) {
            throw new Error(data.message || 'Polling request returned an error.');
        }

        return data as AiJob;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Polling request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * Performs an action (vary or upscale) on a completed AI job's image.
 * @param jobId The ID of the parent job.
 * @param action The action to perform ('vary' or 'upscale').
 * @param index The index of the image within the parent job's files.
 * @returns A promise resolving to the new variation/upscale job's details.
 */
export const performAiAction = async (jobId: string, action: 'vary' | 'upscale', index: number): Promise<CreateJobResponse> => {
    // This API also uses a non-standard GET request with query params.
    return apiFetch('/aig/actions', {
        method: 'GET',
        body: { job_id: jobId, action, index },
    });
};
