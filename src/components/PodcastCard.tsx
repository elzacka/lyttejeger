import { memo } from 'react';
import { MediaCard, PodcastIcon } from './icons';
import type { Podcast } from '../types/podcast';
import { DESCRIPTION_TRUNCATE_LENGTH } from '../constants';

interface PodcastCardProps {
  podcast: Podcast;
  searchQuery?: string;
  onSelect?: (podcast: Podcast) => void;
}

export const PodcastCard = memo(function PodcastCard({
  podcast,
  searchQuery,
  onSelect,
}: PodcastCardProps) {
  const truncatedDescription =
    podcast.description.length > DESCRIPTION_TRUNCATE_LENGTH
      ? `${podcast.description.slice(0, DESCRIPTION_TRUNCATE_LENGTH)}...`
      : podcast.description;

  return (
    <MediaCard
      image={podcast.imageUrl}
      imageFallback={<PodcastIcon size={32} />}
      title={podcast.title}
      subtitle={podcast.author}
      description={truncatedDescription}
      descriptionLines={1}
      layout="horizontal"
      size="md"
      badge={podcast.explicit ? 'E' : undefined}
      highlightTerms={searchQuery}
      onSelect={onSelect ? () => onSelect(podcast) : undefined}
      role="listitem"
    />
  );
});
