import { useState, useEffect, useCallback } from 'react'
import {
  getQueue,
  addToQueue as dbAddToQueue,
  removeFromQueue as dbRemoveFromQueue,
  clearQueue as dbClearQueue,
  playNext as dbPlayNext,
  popFromQueue,
  reorderQueue,
  type QueueItem,
} from '../services/db'
import type { PlayingEpisode } from '../components/AudioPlayer'

export function useQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load queue on mount
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const items = await getQueue()
        setQueue(items)
      } finally {
        setIsLoading(false)
      }
    }
    loadQueue()
  }, [])

  const addToQueue = useCallback(
    async (episode: PlayingEpisode) => {
      await dbAddToQueue({
        episodeId: episode.id,
        podcastId: '',
        title: episode.title,
        podcastTitle: episode.podcastTitle || '',
        audioUrl: episode.audioUrl,
        imageUrl: episode.imageUrl,
        podcastImage: episode.podcastImage,
        duration: episode.duration,
      })
      const items = await getQueue()
      setQueue(items)
    },
    []
  )

  const playNext = useCallback(
    async (episode: PlayingEpisode) => {
      await dbPlayNext({
        episodeId: episode.id,
        podcastId: '',
        title: episode.title,
        podcastTitle: episode.podcastTitle || '',
        audioUrl: episode.audioUrl,
        imageUrl: episode.imageUrl,
        podcastImage: episode.podcastImage,
        duration: episode.duration,
      })
      const items = await getQueue()
      setQueue(items)
    },
    []
  )

  const removeFromQueue = useCallback(async (id: number) => {
    await dbRemoveFromQueue(id)
    const items = await getQueue()
    setQueue(items)
  }, [])

  const clearQueue = useCallback(async () => {
    await dbClearQueue()
    setQueue([])
  }, [])

  const getNextEpisode = useCallback(async (): Promise<PlayingEpisode | null> => {
    const next = await popFromQueue()
    if (!next) return null

    // Refresh queue state
    const items = await getQueue()
    setQueue(items)

    return {
      id: next.episodeId,
      title: next.title,
      audioUrl: next.audioUrl,
      imageUrl: next.imageUrl,
      podcastTitle: next.podcastTitle,
      podcastImage: next.podcastImage,
      duration: next.duration ?? 0,
      description: '',
      publishedAt: '',
      podcastId: next.podcastId,
    }
  }, [])

  const moveItem = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const newQueue = [...queue]
      const [removed] = newQueue.splice(fromIndex, 1)
      newQueue.splice(toIndex, 0, removed)

      // Update positions
      const reordered = newQueue.map((item, index) => ({
        ...item,
        position: index,
      }))

      setQueue(reordered)
      await reorderQueue(reordered)
    },
    [queue]
  )

  const isInQueue = useCallback(
    (episodeId: string) => {
      return queue.some((item) => item.episodeId === episodeId)
    },
    [queue]
  )

  return {
    queue,
    isLoading,
    addToQueue,
    playNext,
    removeFromQueue,
    clearQueue,
    getNextEpisode,
    moveItem,
    isInQueue,
    queueLength: queue.length,
  }
}
