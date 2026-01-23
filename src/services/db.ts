import Dexie, { type EntityTable } from 'dexie';

// Playback position for episodes
export interface PlaybackPosition {
  episodeId: string;
  position: number; // seconds
  duration: number; // seconds
  updatedAt: number; // timestamp
  completed: boolean; // true if >90% played
}

// Queue item for play queue
export interface QueueItem {
  id?: number; // auto-increment
  episodeId: string;
  podcastId: string;
  title: string;
  description?: string; // Episode description for expandable cards
  podcastTitle: string;
  audioUrl: string;
  imageUrl?: string;
  podcastImage?: string;
  duration?: number;
  transcriptUrl?: string;
  chaptersUrl?: string;
  publishedAt?: string;
  season?: number;
  episode?: number;
  addedAt: number; // timestamp
  position: number; // order in queue
}

// Subscription for podcast subscriptions
export interface Subscription {
  podcastId: string;
  title: string;
  author: string;
  imageUrl: string;
  feedUrl: string;
  subscribedAt: number; // timestamp
}

// Database schema
class LyttejegerDB extends Dexie {
  playbackPositions!: EntityTable<PlaybackPosition, 'episodeId'>;
  queue!: EntityTable<QueueItem, 'id'>;
  subscriptions!: EntityTable<Subscription, 'podcastId'>;

  constructor() {
    super('lyttejeger');

    this.version(1).stores({
      playbackPositions: 'episodeId, updatedAt',
      queue: '++id, episodeId, position',
    });

    this.version(2).stores({
      playbackPositions: 'episodeId, updatedAt',
      queue: '++id, episodeId, position',
      subscriptions: 'podcastId, subscribedAt',
    });
  }
}

export const db = new LyttejegerDB();

// Playback position helpers
export async function savePlaybackPosition(
  episodeId: string,
  position: number,
  duration: number
): Promise<void> {
  const completed = duration > 0 && position / duration > 0.9;

  await db.playbackPositions.put({
    episodeId,
    position,
    duration,
    updatedAt: Date.now(),
    completed,
  });
}

export async function getPlaybackPosition(
  episodeId: string
): Promise<PlaybackPosition | undefined> {
  return db.playbackPositions.get(episodeId);
}

export async function clearPlaybackPosition(episodeId: string): Promise<void> {
  await db.playbackPositions.delete(episodeId);
}

export async function getInProgressEpisodes(): Promise<PlaybackPosition[]> {
  return db.playbackPositions
    .where('updatedAt')
    .above(0)
    .filter((p) => !p.completed && p.position > 10)
    .reverse()
    .sortBy('updatedAt');
}

export async function getAllPlaybackPositions(): Promise<Map<string, PlaybackPosition>> {
  const positions = await db.playbackPositions.toArray();
  return new Map(positions.map((p) => [p.episodeId, p]));
}

// Queue helpers
export async function addToQueue(
  item: Omit<QueueItem, 'id' | 'addedAt' | 'position'>
): Promise<void> {
  const lastItem = await db.queue.orderBy('position').last();
  const nextPosition = lastItem ? lastItem.position + 1 : 0;

  await db.queue.add({
    ...item,
    addedAt: Date.now(),
    position: nextPosition,
  });
}

export async function removeFromQueue(id: number): Promise<void> {
  await db.queue.delete(id);
}

export async function getQueue(): Promise<QueueItem[]> {
  return db.queue.orderBy('position').toArray();
}

export async function clearQueue(): Promise<void> {
  await db.queue.clear();
}

export async function reorderQueue(items: QueueItem[]): Promise<void> {
  await db.transaction('rw', db.queue, async () => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id) {
        await db.queue.update(items[i].id!, { position: i });
      }
    }
  });
}

export async function playNext(
  item: Omit<QueueItem, 'id' | 'addedAt' | 'position'>
): Promise<void> {
  // Get all items and shift their positions
  const queue = await getQueue();

  await db.transaction('rw', db.queue, async () => {
    // Shift all existing items
    for (const queueItem of queue) {
      if (queueItem.id) {
        await db.queue.update(queueItem.id, { position: queueItem.position + 1 });
      }
    }

    // Add new item at position 0
    await db.queue.add({
      ...item,
      addedAt: Date.now(),
      position: 0,
    });
  });
}

export async function getNextInQueue(): Promise<QueueItem | undefined> {
  return db.queue.orderBy('position').first();
}

export async function popFromQueue(): Promise<QueueItem | undefined> {
  const next = await getNextInQueue();
  if (next?.id) {
    await removeFromQueue(next.id);
  }
  return next;
}

// Subscription helpers
export async function subscribe(subscription: Omit<Subscription, 'subscribedAt'>): Promise<void> {
  await db.subscriptions.put({
    ...subscription,
    subscribedAt: Date.now(),
  });
}

export async function unsubscribe(podcastId: string): Promise<void> {
  await db.subscriptions.delete(podcastId);
}

export async function getSubscriptions(): Promise<Subscription[]> {
  return db.subscriptions.orderBy('subscribedAt').reverse().toArray();
}

export async function isSubscribed(podcastId: string): Promise<boolean> {
  const sub = await db.subscriptions.get(podcastId);
  return !!sub;
}
