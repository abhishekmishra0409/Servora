const STORAGE_KEY = 'restaurent.kitchen.token';

export const kitchenAuthStorage = {
  get: () => localStorage.getItem(STORAGE_KEY),
  set: (value: string) => localStorage.setItem(STORAGE_KEY, value),
};

