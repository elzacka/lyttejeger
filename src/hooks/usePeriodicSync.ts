/**
 * usePeriodicSync - Register periodic background sync for updating subscriptions
 *
 * Periodic Background Sync allows the app to update podcast subscriptions in the background,
 * even when the app is not open. This improves the user experience by ensuring fresh content.
 *
 * Requirements:
 * - HTTPS (or localhost for development)
 * - Service worker registered
 * - User has installed the PWA
 * - Browser support (Chrome 80+, Edge 80+)
 */

import { useEffect } from 'react';

export function usePeriodicSync() {
  useEffect(() => {
    // Check if Periodic Background Sync is supported
    if (!('periodicSync' in self.registration)) {
      console.log('Periodic Background Sync is not supported');
      return;
    }

    const registerPeriodicSync = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Request permission for periodic sync
        const status = await (navigator as any).permissions.query({
          name: 'periodic-background-sync',
        });

        if (status.state === 'granted') {
          // Register periodic sync - update every 12 hours
          await (registration as any).periodicSync.register('update-subscriptions', {
            minInterval: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
          });

          console.log('Periodic Background Sync registered successfully');
        } else {
          console.log('Periodic Background Sync permission not granted');
        }
      } catch (error) {
        console.error('Failed to register Periodic Background Sync:', error);
      }
    };

    // Register when service worker is ready
    if ('serviceWorker' in navigator) {
      registerPeriodicSync();
    }

    // Cleanup function to unregister on unmount
    return () => {
      if ('serviceWorker' in navigator && 'periodicSync' in self.registration) {
        navigator.serviceWorker.ready.then(async (registration) => {
          try {
            await (registration as any).periodicSync.unregister('update-subscriptions');
            console.log('Periodic Background Sync unregistered');
          } catch (error) {
            console.error('Failed to unregister Periodic Background Sync:', error);
          }
        });
      }
    };
  }, []);
}
