import { apiFetch } from './api';
import type { BillingPlan, BillingSubscription, Invoice } from '../types';

export const fetchPlans = async (interval: 'month' = 'month'): Promise<BillingPlan[]> => {
  const response = await apiFetch('/billing/plans', {
    method: 'GET',
    auth: true,
    body: { interval },
  });

  return response?.plans ?? [];
};

export const fetchSubscription = async (): Promise<BillingSubscription | null> => {
  const response = await apiFetch('/billing/subscription', {
    method: 'GET',
    auth: true,
  });

  return response?.subscription ?? null;
};

export const subscribeToPlan = async (planId: string) => {
  return apiFetch('/billing/subscribe', {
    method: 'POST',
    auth: true,
    body: { plan_id: planId },
  });
};

export const toggleCancelAtPeriodEnd = async (cancelAtPeriodEnd: boolean) => {
  const response = await apiFetch('/billing/subscription/cancel', {
    method: 'POST',
    auth: true,
    body: { cancel_at_period_end: cancelAtPeriodEnd },
  });

  return response?.subscription as BillingSubscription | null;
};

export const changeSubscriptionPlan = async (planId: string) => {
  const response = await apiFetch('/billing/subscription/change-plan', {
    method: 'POST',
    auth: true,
    body: { new_plan_id: planId },
  });

  return response?.subscription as BillingSubscription | null;
};

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const response = await apiFetch('/billing/invoices', {
    method: 'GET',
    auth: true,
  });

  return response?.invoices ?? [];
};

export const fetchInvoice = async (invoiceId: string): Promise<Invoice | null> => {
  const response = await apiFetch(`/billing/invoices/${invoiceId}`, {
    method: 'GET',
    auth: true,
  });

  return response?.invoice ?? null;
};
