/**
 * useShareTarget - Handle shared content from Web Share Target API
 *
 * The Web Share Target API allows the app to receive shared content from other apps.
 * Users can share podcast URLs directly to Lyttejeger from their browser or other apps.
 *
 * How it works:
 * 1. User shares a podcast URL from another app/browser
 * 2. OS shows Lyttejeger as a share target (if installed as PWA)
 * 3. Service worker intercepts the share and redirects to app with query params
 * 4. This hook reads the query params and processes the shared content
 */

import { useEffect } from 'react';

interface ShareData {
  url?: string;
  text?: string;
  title?: string;
}

export function useShareTarget(onShare: (data: ShareData) => void) {
  useEffect(() => {
    // Check URL for shared content on mount
    const urlParams = new URLSearchParams(window.location.search);

    const sharedUrl = urlParams.get('shared_url');
    const sharedText = urlParams.get('shared_text');
    const sharedTitle = urlParams.get('shared_title');

    if (sharedUrl || sharedText || sharedTitle) {
      // Process shared content
      onShare({
        url: sharedUrl || undefined,
        text: sharedText || undefined,
        title: sharedTitle || undefined,
      });

      // Clean up URL parameters after processing
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('shared_url');
      cleanUrl.searchParams.delete('shared_text');
      cleanUrl.searchParams.delete('shared_title');

      // Replace history state to remove share params
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, [onShare]);
}

/**
 * Helper function to check if Web Share API is supported for sharing FROM the app
 */
export function canShare(): boolean {
  return navigator.share !== undefined;
}

/**
 * Share content using Web Share API
 */
export async function shareContent(data: ShareData): Promise<boolean> {
  if (!canShare()) {
    return false;
  }

  try {
    await navigator.share({
      title: data.title,
      text: data.text,
      url: data.url,
    });
    return true;
  } catch (error) {
    // User cancelled or error occurred
    console.error('Share failed:', error);
    return false;
  }
}
