import { apiFetch } from './api';

export const deductBalance = async (amount: number): Promise<{ balance: number }> => {
  const response = await apiFetch('/profile/deduct', {
    method: 'POST',
    auth: true,
    body: { amount },
  });
  return response as { balance: number };
};
