export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.error('This browser does not support desktop notifications');
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return 'denied';
};

export const sendNotification = async (title, options = {}) => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    // Try to use Service Worker for notifications (Better for Mobile/PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [100, 50, 100],
            ...options
          });
          return;
        }
      } catch (error) {
        console.warn('Service Worker notification failed, falling back to standard API', error);
      }
    }

    // Fallback to standard Notification API
    const notification = new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options
    });

    notification.onclick = function(event) {
      event.preventDefault();
      window.focus();
      notification.close();
    }
  }
};

export const getNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};
