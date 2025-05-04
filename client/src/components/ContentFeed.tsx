import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  // State hooks - all defined at the top level
  const [page, setPage] = useState(1);
  const [shuffleSeed] = useState(() => Math.random().toString(36).substring(2, 10));
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [columnCount, setColumnCount] = useState(4); // Default to 4 columns
  const [popularBlocks, setPopularBlocks] = useState<ContentFeedResponse['popular']['blocks']>([]);

  // Ref hooks - all defined at the top level
  const previousDataRef = useRef<ContentFeedResponse | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  // Query key for TanStack Query
  const queryKey = ['/api/content/feed', { page, category: categorySlug || '', shuffleSeed, sortBy }];

  // Data fetching with TanStack Query
  const { data, isLoading, isError } = useQuery<ContentFeedResponse>({
    queryKey,
    placeholderData: previousDataRef.current,
  });

  // Memoized helper functions
  const getItemsBasedOnColumns = useCallback((items: Video[] = [], rows: number) => {
    const totalItems = columnCount * rows;
    return items?.slice(0, totalItems) || [];
  }, [columnCount]);

  const insertAdvertisement = useCallback((items: Video[] = [], adPosition: number = 0) => {
    // Deep copy the array to avoid modifying the original
    const result = [...(items || [])];
    // Adjust position if it exceeds array length
    const position = Math.min(adPosition, result.length - 1);
    // Replace the item at the position with null (to be rendered as an ad)
    if (result.length > 0) {
      result[position] = null as unknown as Video;
    }
    return result;
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
  }, []);

  // Process data for rendering - dynamic column/row adjustments
  const renderData = useMemo(() => {
    if (!data) return null;
    
    // Process popular blocks with dynamic column/row logic
    const processedPopularBlocks = popularBlocks.map(block => ({
      videos: getItemsBasedOnColumns(block.videos, 3), // Always 3 rows of videos
      images: getItemsBasedOnColumns(block.images, 1), // Always 1 row of images
      advertisement: block.advertisement
    }));
    
    return {
      trending: {
        videos: getItemsBasedOnColumns(data?.trending?.videos, 3), // Always 3 rows of videos
        images: getItemsBasedOnColumns(data?.trending?.images, 1),  // Always 1 row of images
        advertisement: data?.trending?.advertisement
      },
      recent: {
        videos: getItemsBasedOnColumns(data?.recent?.videos, 3), // Always 3 rows of videos
        images: getItemsBasedOnColumns(data?.recent?.images, 1),  // Always 1 row of images
        advertisement: data?.recent?.advertisement
      },
      popular: processedPopularBlocks
    };
  }, [data, popularBlocks, getItemsBasedOnColumns]);

  // Effect for handling clicks outside the sort menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSortMenu && 
        sortMenuRef.current && 
        sortButtonRef.current && 
        !sortMenuRef.current.contains(event.target as Node) &&
        !sortButtonRef.current.contains(event.target as Node)
      ) {
        setShowSortMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu]);

  // Effect for updating previous data ref
  useEffect(() => {
    if (data) {
      previousDataRef.current = data;
    }
  }, [data]);

  // Effect for handling popular blocks updates
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

  // Effect for detecting screen size and updating column count
  useEffect(() => {
    function updateColumnCount() {
      // Default is 1 column for mobile
      let columns = 1;
      
      // Match the breakpoints in our Tailwind CSS classes
      if (window.innerWidth >= 1280) { // xl breakpoint
        columns = 4;
      } else if (window.innerWidth >= 1024) { // lg breakpoint
        columns = 3;
      } else if (window.innerWidth >= 640) { // sm breakpoint
        columns = 2;
      }
      
      setColumnCount(columns);
    }
    
    // Set initial column count
    updateColumnCount();
    
    // Update column count when window is resized
    window.addEventListener('resize', updateColumnCount);
    
    // Clean up event listener on component unmount
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  // Effect for infinite scrolling with intersection observer
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
      {/* Featured Video (Large Hero) */}
      {data.featured.video && (
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white border-l-4 border-orange-500 pl-4">
              {data.featured.title}
            </h2>
            
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
        
        {/* Video Grid (3 rows of videos) */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {renderData && insertAdvertisement(renderData.trending.videos, renderData.trending.advertisement.position)
              .map((video, index) => 
                video ? (
                  <VideoCard key={`trending-video-${video.id}-${index}`} video={video} />
                ) : (
                  <AdvertisementCard key={`trending-ad-${index}`} type="video" />
                )
              )}
          </div>
        </div>
        
        {/* Image Row (1 row of images) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {renderData && renderData.trending.images.map((image, index) => (
            <ImageCard key={`trending-image-${image.id}-${index}`} image={image} />
          ))}
        </div>
      </section>

      {/* Recently Uploaded Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-white border-l-4 border-orange-500 pl-4">
          Recently Uploaded
        </h2>
        
        {/* Video Grid (3 rows of videos) */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {renderData && insertAdvertisement(renderData.recent.videos, renderData.recent.advertisement.position)
              .map((video, index) => 
                video ? (
                  <VideoCard key={`recent-video-${video.id}-${index}`} video={video} />
                ) : (
                  <AdvertisementCard key={`recent-ad-${index}`} type="video" />
                )
              )}
          </div>
        </div>
        
        {/* Image Row (1 row of images) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {renderData && renderData.recent.images.map((image, index) => (
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
        {renderData && renderData.popular.map((block, blockIndex) => (
          <div key={`popular-block-${blockIndex}`} className="mb-12">
            {/* Video Grid (3 rows of videos) */}
            <div className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
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
            
            {/* Image Row (1 row of images) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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