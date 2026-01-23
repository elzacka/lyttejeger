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

  const subscribe = useCallback(async (podcast: Podcast) => {
    await dbSubscribe({
      podcastId: podcast.id,
      title: podcast.title,
      author: podcast.author,
      imageUrl: podcast.imageUrl,
      feedUrl: podcast.feedUrl,
    });
    const items = await getSubscriptions();
    setSubscriptions(items);
  }, []);

  const unsubscribe = useCallback(async (podcastId: string) => {
    await dbUnsubscribe(podcastId);
    const items = await getSubscriptions();
    setSubscriptions(items);
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
