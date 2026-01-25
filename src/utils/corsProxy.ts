/**
 * CORS proxy utility for development
 * In development, proxies requests through /api/cors-proxy to avoid CORS issues
 * In production, fetches directly (assumes proper CORS headers or same-origin)
 */

const isDev = import.meta.env.DEV;

export function getCorsProxyUrl(url: string): string {
  if (!isDev) {
    // In production, fetch directly
    return url;
  }

  // In development, use our CORS proxy
  return `/api/cors-proxy?url=${encodeURIComponent(url)}`;
}
