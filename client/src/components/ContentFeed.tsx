import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import VideoCard from './VideoCard';
import ImageCard from './ImageCard';
import AdvertisementCard from './AdvertisementCard';
import { Loader2 } from 'lucide-react';
import { Video } from '@shared/schema';

interface ContentFeedProps {
  categorySlug?: string;
}

interface ContentFeedResponse {
  featured: {
    video: Video | null;
    title: string;
  };
  trending: {
    videos: Video[];
    images: Video[];
    advertisement: { position: number };
  };
  recent: {
    videos: Video[];
    images: Video[];
    advertisement: { position: number };
  };
  popular: {
    blocks: Array<{
      videos: Video[];
      images: Video[];
      advertisement: { position: number };
    }>;
    hasMore: boolean;
  };
}

export default function ContentFeed({ categorySlug }: ContentFeedProps) {
  const [page, setPage] = useState(1);
  // Generate a consistent seed for this session
  const [shuffleSeed] = useState(() => Math.random().toString(36).substring(2, 10));

  // Keep track of the previous data for placeholderData
  const previousDataRef = useRef<ContentFeedResponse | undefined>(undefined);

  // Create a query key that includes category and shuffle seed
  const queryKey = ['/api/content/feed', { page, category: categorySlug || '', shuffleSeed }];

  // Using proper TanStack Query v5 syntax
  const { data, isLoading, isError } = useQuery<ContentFeedResponse>({
    queryKey,
    placeholderData: previousDataRef.current,
  });
  
  // Update the ref with the latest data
  useEffect(() => {
    if (data) {
      previousDataRef.current = data;
    }
  }, [data]);

  const [popularBlocks, setPopularBlocks] = useState<ContentFeedResponse['popular']['blocks']>([]);

  // When new data arrives, append popular blocks to our existing state
  useEffect(() => {
    if (data?.popular?.blocks) {
      if (page === 1) {
        // Reset blocks on first page
        setPopularBlocks(data.popular.blocks);
      } else {
        // Append new blocks for subsequent pages
        setPopularBlocks(prev => [...prev, ...data.popular.blocks]);
      }
    }
  }, [data, page]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    // Create an observer for the loading indicator
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && data?.popular?.hasMore) {
          setPage(prevPage => prevPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    // Observe the loading indicator element
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
      observer.observe(loadingElement);
    }

    return () => {
      if (loadingElement) {
        observer.unobserve(loadingElement);
      }
    };
  }, [data]);

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-12 text-red-500">
        <h2 className="text-2xl font-bold mb-4">Error Loading Content</h2>
        <p>Unable to load videos. Please try again later.</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Helper function to insert ad at a specific position
  const insertAdvertisement = (items: Video[], adPosition: number) => {
    // Deep copy the array to avoid modifying the original
    const result = [...items];
    // Adjust position if it exceeds array length
    const position = Math.min(adPosition, items.length);
    // Add a null item that will be rendered as an ad
    result.splice(position, 0, null as unknown as Video);
    return result;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Featured Video (Large Hero) */}
      {data.featured.video && (
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-white border-l-4 border-orange-500 pl-4">
            {data.featured.title}
          </h2>
          <div className="max-w-4xl mx-auto">
            <VideoCard video={data.featured.video} size="large" />
          </div>
        </section>
      )}

      {/* Trending Now Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-white border-l-4 border-orange-500 pl-4">
          Trending Now
        </h2>
        
        {/* Video Grid (3 rows, 4 videos each) */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {insertAdvertisement(data.trending.videos, data.trending.advertisement.position)
              .map((video, index) => 
                video ? (
                  <VideoCard key={`trending-video-${video.id}-${index}`} video={video} />
                ) : (
                  <AdvertisementCard key={`trending-ad-${index}`} type="video" />
                )
              )}
          </div>
        </div>
        
        {/* Image Row (1 row, 4 images) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {data.trending.images.map((image, index) => (
            <ImageCard key={`trending-image-${image.id}-${index}`} image={image} />
          ))}
        </div>
      </section>

      {/* Recently Uploaded Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-white border-l-4 border-orange-500 pl-4">
          Recently Uploaded
        </h2>
        
        {/* Video Grid (3 rows, 4 videos each) */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {insertAdvertisement(data.recent.videos, data.recent.advertisement.position)
              .map((video, index) => 
                video ? (
                  <VideoCard key={`recent-video-${video.id}-${index}`} video={video} />
                ) : (
                  <AdvertisementCard key={`recent-ad-${index}`} type="video" />
                )
              )}
          </div>
        </div>
        
        {/* Image Row (1 row, 4 images) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {data.recent.images.map((image, index) => (
            <ImageCard key={`recent-image-${image.id}-${index}`} image={image} />
          ))}
        </div>
      </section>

      {/* Popular Content Section - Infinite Scroll */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-white border-l-4 border-orange-500 pl-4">
          Popular Content
        </h2>
        
        {/* Render all loaded popular blocks */}
        {popularBlocks.map((block, blockIndex) => (
          <div key={`popular-block-${blockIndex}`} className="mb-12">
            {/* Video Grid (3 rows, 4 videos each) */}
            <div className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {insertAdvertisement(block.videos, block.advertisement.position)
                  .map((video, index) => 
                    video ? (
                      <VideoCard key={`popular-video-${video?.id || index}-${blockIndex}`} video={video} />
                    ) : (
                      <AdvertisementCard key={`popular-ad-${blockIndex}-${index}`} type="video" />
                    )
                  )}
              </div>
            </div>
            
            {/* Image Row (1 row, 4 images) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {block.images.map((image, index) => (
                <ImageCard key={`popular-image-${image.id}-${index}-${blockIndex}`} image={image} />
              ))}
            </div>
          </div>
        ))}

        {/* Loading indicator for infinite scroll */}
        <div id="loading-indicator" className="flex justify-center p-8">
          {data.popular.hasMore && (
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          )}
        </div>
      </section>
    </div>
  );
}
