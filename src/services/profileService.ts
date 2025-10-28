import { apiFetch } from './api';

export const deductBalance = async (amount: number): Promise<{ balance: number }> => {
  return apiFetch('/profile/deduct', {
    method: 'POST',
    auth: true,
    body: { amount },
  });
};
