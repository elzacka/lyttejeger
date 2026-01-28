import { useState, useEffect, useCallback } from 'react';
import {
  getSubscriptions,
  subscribe as dbSubscribe,
  unsubscribe as dbUnsubscribe,
  type Subscription,
} from '../services/db';
import type { Podcast } from '../types/podcast';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load subscriptions on mount
  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const items = await getSubscriptions();
        setSubscriptions(items);
      } finally {
        setIsLoading(false);
      }
    };
    loadSubscriptions();
  }, []);

  // Subscribe with optimistic update - no refetch needed
  const subscribe = useCallback(async (podcast: Podcast) => {
    // Create optimistic subscription
    const optimisticSub: Subscription = {
      podcastId: podcast.id,
      title: podcast.title,
      author: podcast.author,
      imageUrl: podcast.imageUrl,
      feedUrl: podcast.feedUrl,
      subscribedAt: Date.now(),
    };

    // Optimistically add to state (prevents duplicate)
    setSubscriptions((prev) => {
      if (prev.some((s) => s.podcastId === podcast.id)) return prev;
      return [...prev, optimisticSub];
    });

    try {
      await dbSubscribe(optimisticSub);
    } catch (error) {
      // Rollback on error
      setSubscriptions((prev) => prev.filter((s) => s.podcastId !== podcast.id));
      throw error;
    }
  }, []);

  // Unsubscribe with optimistic update - no refetch needed
  const unsubscribe = useCallback(async (podcastId: string) => {
    let removedSub: Subscription | undefined;

    // Optimistically remove from state
    setSubscriptions((prev) => {
      removedSub = prev.find((s) => s.podcastId === podcastId);
      return prev.filter((s) => s.podcastId !== podcastId);
    });

    try {
      await dbUnsubscribe(podcastId);
    } catch (error) {
      // Rollback on error
      if (removedSub) {
        setSubscriptions((prev) => [...prev, removedSub!]);
      }
      throw error;
    }
  }, []);

  const isSubscribed = useCallback(
    (podcastId: string) => {
      return subscriptions.some((sub) => sub.podcastId === podcastId);
    },
    [subscriptions]
  );

  return {
    subscriptions,
    isLoading,
    subscribe,
    unsubscribe,
    isSubscribed,
    subscriptionCount: subscriptions.length,
  };
}
