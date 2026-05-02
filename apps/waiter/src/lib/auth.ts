const STORAGE_KEY = 'restaurent.waiter.token';

export const authStorage = {
  get: () => localStorage.getItem(STORAGE_KEY),
  set: (value: string) => localStorage.setItem(STORAGE_KEY, value),
};

