/**
 * Shared rate limiter utility for API clients
 * Provides token bucket rate limiting with configurable intervals
 */

export interface RateLimiterOptions {
  /** Minimum milliseconds between requests */
  minInterval: number;
  /** Maximum retry attempts for rate limit errors */
  maxRetries?: number;
  /** Base delay for exponential backoff (ms) */
  retryBaseDelay?: number;
}

/**
 * Creates a rate limiter instance
 * Uses token bucket algorithm with enforced minimum interval
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { minInterval, maxRetries = 3, retryBaseDelay = 1000 } = options;
  let lastRequestTime = 0;

  /**
   * Wait until rate limit allows another request
   */
  async function waitForSlot(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
  }

  /**
   * Execute a function with rate limiting and retry logic
   */
  async function execute<T>(
    fn: () => Promise<T>,
    isRateLimitError?: (error: unknown) => boolean
  ): Promise<T> {
    await waitForSlot();

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if this is a rate limit error that should be retried
        const shouldRetry = isRateLimitError?.(error) ?? false;

        if (shouldRetry && attempt < maxRetries) {
          // Exponential backoff
          const delay = retryBaseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  function reset(): void {
    lastRequestTime = 0;
  }

  return {
    waitForSlot,
    execute,
    reset,
  };
}

/**
 * Pre-configured rate limiters for known APIs
 */
export const rateLimiters = {
  // Podcast Index: 1 req/sec
  podcastIndex: createRateLimiter({
    minInterval: 1000,
    maxRetries: 3,
    retryBaseDelay: 2000,
  }),

  // Listen Notes: 2 req/sec
  listenNotes: createRateLimiter({
    minInterval: 500,
    maxRetries: 3,
    retryBaseDelay: 1000,
  }),
};

/**
 * Type guard for HTTP response rate limit errors
 */
export function isHttpRateLimitError(error: unknown): boolean {
  if (error instanceof Error && error.message.includes('429')) {
    return true;
  }
  // Check for Response object with 429 status
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 429;
  }
  return false;
}
