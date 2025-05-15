import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import VideoCard from './VideoCard';
import ImageCard from './ImageCard';
import AdvertisementCard from './AdvertisementCard';
import { Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Video } from '@shared/schema';

interface ContentFeedProps {
  categorySlug?: string;
}

type SortOption = 'newest' | 'oldest' | 'most-viewed' | 'trending' | 'popular';

// Response interface from content feed API
interface ContentFeedResponse {
  featured: {
    video: Video | null;
  };
  content: {
    videos: Video[];
    images: Video[];
    adPositions: number[];
    hasMore: boolean;
  };
}

// Chunk interface for rendering
interface ContentChunk {
  videos: Video[];
  images: Video[];
  hasAdInVideo: boolean;
  hasAdInImage: boolean;
  adPosition: number;
}

export default function ContentFeed({ categorySlug }: ContentFeedProps) {
  // State hooks
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('popular'); // Default to popular
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [columnCount, setColumnCount] = useState(3); // Default to 3 columns for large screens
  const [loadedVideos, setLoadedVideos] = useState<Video[]>([]);
  const [loadedImages, setLoadedImages] = useState<Video[]>([]);
  const [adPositions, setAdPositions] = useState<number[]>([]);

  // Ref hooks
  const previousDataRef = useRef<ContentFeedResponse | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Data fetching with TanStack Query
  const queryKey = useMemo(() => {
    return ['/api/content/feed', { 
      page, 
      category: categorySlug || '', 
      sortBy
    }];
  }, [page, categorySlug, sortBy]);

  const { data, isLoading, isError } = useQuery<ContentFeedResponse>({
    queryKey,
    placeholderData: previousDataRef.current,
  });
  
  // Save data in ref for pagination
  useEffect(() => {
    if (data) {
      previousDataRef.current = data;
    }
  }, [data]);

  // Append new data when page changes
  useEffect(() => {
    if (data?.content) {
      if (page === 1) {
        // First page - replace existing data
        setLoadedVideos(data.content.videos);
        setLoadedImages(data.content.images);
        setAdPositions(data.content.adPositions);
      } else {
        // Additional pages - append data
        setLoadedVideos(prev => [...prev, ...data.content.videos]);
        setLoadedImages(prev => [...prev, ...data.content.images]);
        setAdPositions(prev => [...prev, ...data.content.adPositions]);
      }
    }
  }, [data, page]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && data?.content.hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, options);

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [data?.content.hasMore]);

  // Handle clicks outside the sort menu to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sortMenuRef.current && 
        !sortMenuRef.current.contains(event.target as Node) &&
        sortButtonRef.current && 
        !sortButtonRef.current.contains(event.target as Node)
      ) {
        setShowSortMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update column count based on window width
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 640) {
        setColumnCount(1); // Mobile: 1 column
      } else if (window.innerWidth < 1024) {
        setColumnCount(2); // Tablet: 2 columns
      } else {
        setColumnCount(3); // Desktop: 3 columns
      }
    }

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Event handler callbacks
  const toggleSortMenu = useCallback(() => {
    setShowSortMenu(prev => !prev);
  }, []);

  const handleSortChange = useCallback((option: SortOption) => {
    setSortBy(option);
    setShowSortMenu(false);
    // Reset page when sort changes
    setPage(1);
    setLoadedVideos([]);
    setLoadedImages([]);
    setAdPositions([]);
    
    // Store the current featured video before invalidating the query
    const currentFeaturedVideo = previousDataRef.current?.featured?.video;
    
    // Force data refresh with new sort option
    console.log(`Changing sort option to: ${option}, preserving category: ${categorySlug || 'all'}`);
    
    // Invalidate the specific query with the current category
    queryClient.invalidateQueries({ 
      predicate: (query: any) => {
        // Check if this is a content feed query
        if (!Array.isArray(query.queryKey) || query.queryKey[0] !== '/api/content/feed') {
          return false;
        }
        return true;
      }
    });
    
    // If we have a featured video in the current data, make sure it persists
    if (currentFeaturedVideo && previousDataRef.current) {
      // Create a new partial response with the existing featured video
      const partialResponse: Partial<ContentFeedResponse> = {
        featured: { video: currentFeaturedVideo }
      };
      
      // Update the query data to maintain the featured video
      queryClient.setQueryData(
        ['/api/content/feed', { page: 1, category: categorySlug || '', sortBy: option }],
        (oldData: any) => {
          if (!oldData) return partialResponse;
          return {
            ...oldData,
            featured: partialResponse.featured
          };
        }
      );
    }
  }, [categorySlug, previousDataRef]);

  // Process data for rendering - dynamic column/row adjustments
  const renderContent = useMemo<ContentChunk[]>(() => {
    if (!loadedVideos.length && !loadedImages.length) return [];

    // Group videos and images into chunks for display
    // We want to display videos first (4 rows), then images (2 rows), and repeat
    const chunks: ContentChunk[] = [];
    const videoRowSize = 4 * columnCount; // 4 rows of videos
    const imageRowSize = 2 * columnCount; // 2 rows of images
    
    // Calculate how many complete chunks we can create
    const maxCompleteChunks = Math.min(
      Math.floor(loadedVideos.length / videoRowSize),
      Math.floor(loadedImages.length / imageRowSize)
    );
    
    // Create complete chunks with both videos and images
    for (let i = 0; i < maxCompleteChunks; i++) {
      chunks.push({
        videos: loadedVideos.slice(i * videoRowSize, (i + 1) * videoRowSize),
        images: loadedImages.slice(i * imageRowSize, (i + 1) * imageRowSize),
        hasAdInVideo: adPositions.includes(i * 2),     // Even chunk positions
        hasAdInImage: adPositions.includes(i * 2 + 1), // Odd chunk positions
        adPosition: i % 6 // Position to place the ad (for randomization)
      });
    }

    // Add any remaining videos
    if (loadedVideos.length > maxCompleteChunks * videoRowSize) {
      chunks.push({
        videos: loadedVideos.slice(maxCompleteChunks * videoRowSize),
        images: [],
        hasAdInVideo: adPositions.includes(maxCompleteChunks * 2),
        hasAdInImage: false,
        adPosition: maxCompleteChunks % 6
      });
    }

    // Add any remaining images
    if (loadedImages.length > maxCompleteChunks * imageRowSize) {
      chunks.push({
        videos: [],
        images: loadedImages.slice(maxCompleteChunks * imageRowSize),
        hasAdInVideo: false,
        hasAdInImage: adPositions.includes(maxCompleteChunks * 2 + 1),
        adPosition: (maxCompleteChunks + 1) % 6
      });
    }

    return chunks;
  }, [loadedVideos, loadedImages, adPositions, columnCount]);

  // Loading state
  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-center">
          <h2 className="text-2xl mb-4">Failed to load content</h2>
          <Button 
            variant="destructive" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }  

  // No data state
  if (!data) {
    return null;
  }

  // Render the content feed
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Header with Sort Controls - Always visible */}
      <div className="flex justify-between items-center mb-6">
        {/* Section title */}
        <h2 className="text-xl font-bold text-white">
          {data?.featured?.video ? "Featured Video" : "Content Feed"}
        </h2>
        
        {/* Controls: Sort Button */}
        <div className="flex items-center">
          {/* Sort Button and Dropdown */}
          <div className="relative">
            <Button
              ref={sortButtonRef}
              onClick={toggleSortMenu}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 px-3 py-1.5 text-sm border-gray-700 bg-black/50 hover:bg-black/80"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Sort</span>
            </Button>
          
            {showSortMenu && (
              <div 
                ref={sortMenuRef}
                className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-black border border-gray-700 ring-1 ring-black ring-opacity-5 z-50"
              >
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    className={`${sortBy === 'newest' ? 'bg-gray-800 text-orange-500' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('newest')}
                    role="menuitem"
                  >
                    Newest First
                  </button>
                  <button
                    className={`${sortBy === 'oldest' ? 'bg-gray-800 text-orange-500' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('oldest')}
                    role="menuitem"
                  >
                    Oldest First
                  </button>
                  <button
                    className={`${sortBy === 'most-viewed' ? 'bg-gray-800 text-orange-500' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('most-viewed')}
                    role="menuitem"
                  >
                    Most Viewed
                  </button>
                  <button
                    className={`${sortBy === 'trending' ? 'bg-gray-800 text-orange-500' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('trending')}
                    role="menuitem"
                  >
                    Trending
                  </button>
                  <button
                    className={`${sortBy === 'popular' ? 'bg-gray-800 text-orange-500' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('popular')}
                    role="menuitem"
                  >
                    Popular
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
          
      {/* Featured Video - only shown on first page */}
      {data?.featured?.video && page === 1 && (
        <section className="mb-12">
          <div className="max-w-4xl mx-auto">
            <VideoCard 
              video={data.featured.video} 
              size="large"
              isFeatured={true}
            />
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="space-y-12">
        {renderContent.map((chunk, chunkIndex) => (
          <section key={`chunk-${chunkIndex}`} className="space-y-8">
            {/* Video Section - 4 rows (12 videos for 3 columns) */}
            {chunk.videos.length > 0 && (
              <div className="mb-8">
                {/* Video grid with ad insertion */}
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
                  {chunk.videos.map((video, i) => (
                    <VideoCard 
                      key={`video-${video.id}-${i}`} 
                      video={video}
                    />
                  ))}
                </div>
                
                {/* Video Section Ad */}
                {chunk.hasAdInVideo && (
                  <div className="my-6">
                    <AdvertisementCard 
                      position={`video-section-${chunkIndex}`}
                      type="banner" 
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Image Section - 2 rows (6 images for 3 columns) */}
            {chunk.images.length > 0 && (
              <div className="mb-8">
                {/* Image grid */}
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
                  {chunk.images.map((image, i) => (
                    <ImageCard 
                      key={`image-${image.id}-${i}`}
                      image={image}
                    />
                  ))}
                </div>
                
                {/* Image Section Ad */}
                {chunk.hasAdInImage && (
                  <div className="my-6">
                    <AdvertisementCard 
                      position={`image-section-${chunkIndex}`}
                      type="banner"
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      
      {/* Loading indicator */}
      {isLoading && page > 1 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      )}
      
      {/* Load more trigger element */}
      {data.content.hasMore && (
        <div ref={loadMoreRef} className="h-10" />
      )}
      
      {/* No more content indicator */}
      {!data.content.hasMore && loadedVideos.length + loadedImages.length > 0 && (
        <div className="text-center text-gray-400 py-8">
          No more content available
        </div>
      )}
    </div>
  );
}