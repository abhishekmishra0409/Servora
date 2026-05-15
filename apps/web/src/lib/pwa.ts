export const registerServiceWorker = (): void => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        if (registration.scope.startsWith(`${window.location.origin}/`)) {
          void registration.unregister();
        }
      }
    });
    return;
  }

  const isCustomerRoute = window.location.pathname.startsWith('/r/');
  const customerScope = `${window.location.origin}/r/`;

  if (!isCustomerRoute) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        if (registration.scope !== customerScope) {
          void registration.unregister();
        }
      }
    });
    return;
  }

  void navigator.serviceWorker.register('/sw.js', { scope: '/r/' });
};
