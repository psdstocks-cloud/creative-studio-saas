import { shutterstockAdapter } from './providers/shutterstock.js';

const adapters = [shutterstockAdapter];

export const registerAdapter = (adapter) => {
  if (adapter && typeof adapter.canHandle === 'function') {
    adapters.push(adapter);
  }
};

export const resolveAdapterForUrl = (url) => {
  return adapters.find((adapter) => {
    try {
      return adapter.canHandle(url);
    } catch (error) {
      console.error('Adapter canHandle failed', error);
      return false;
    }
  }) || null;
};

export const getRegisteredAdapters = () => [...adapters];
