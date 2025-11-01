import { apiFetch } from './api';
import type { Order } from '../types';

interface CreateOrderPayload {
  taskId: string;
  site: string;
  stockId: string;
  sourceUrl: string;
}

interface CreateOrderResponse {
  order: Order;
  balance: number;
}

export const createOrder = async (payload: CreateOrderPayload): Promise<CreateOrderResponse> => {
  const data = await apiFetch('/orders', {
    method: 'POST',
    auth: true,
    body: payload,
  });

  if (!data || typeof data !== 'object' || !('order' in data) || !('balance' in data)) {
    throw new Error('Unexpected response while creating order.');
  }

  const { order, balance } = data as CreateOrderResponse;
  return { order, balance };
};

export const getOrders = async (): Promise<Order[]> => {
  const data = await apiFetch('/orders', {
    method: 'GET',
    auth: true,
  });

  if (!data || typeof data !== 'object' || !('orders' in data)) {
    throw new Error('Unexpected response while fetching orders.');
  }

  return (data as { orders: Order[] }).orders;
};

export const updateOrder = async (taskId: string, updates: Partial<Order>): Promise<void> => {
  await apiFetch(`/orders/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    auth: true,
    body: updates,
  });
};

export const findOrderBySiteAndId = async (site: string, id: string): Promise<Order | null> => {
  const data = await apiFetch('/orders/lookup', {
    method: 'GET',
    auth: true,
    params: { site, id },
  });

  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response while looking up order.');
  }

  return 'existing' in data && data.existing ? (data.existing as Order) : null;
};
