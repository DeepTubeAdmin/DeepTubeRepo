import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [page, setPage] = useState(1);
  // Generate a consistent seed for this session
  const [shuffleSeed] = useState(() => Math.random().toString(36).substring(2, 10));
  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [showSortMenu, setShowSortMenu] = useState(false);
  // Track column count based on screen size
  const [columnCount, setColumnCount] = useState(4); // Default to 4 columns

  // Keep track of the previous data for placeholderData
  const previousDataRef = useRef<ContentFeedResponse | undefined>(undefined);

  // Sort menu refs for click outside handling
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  // Create a query key that includes category and shuffle seed and sort option
  const queryKey = ['/api/content/feed', { page, category: categorySlug || '', shuffleSeed, sortBy }];

  // Using proper TanStack Query v5 syntax
  const { data, isLoading, isError } = useQuery<ContentFeedResponse>({
    queryKey,
    placeholderData: previousDataRef.current,
  });
  
  // Toggle sort menu
  const toggleSortMenu = () => {
    setShowSortMenu(!showSortMenu);
  };
  
  // Handle sort change
  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setShowSortMenu(false);
    // Reset page when sort changes
    setPage(1);
  };
  
  // Handle clicks outside of the sort menu
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
  
  // Handle detecting screen size and updating column count
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

  // Calculate how many items to show based on columns and rows
  const getItemsBasedOnColumns = (items: Video[] = [], rows: number) => {
    const totalItems = columnCount * rows;
    return items?.slice(0, totalItems) || [];
  };
  
  // Prepare video and image data for rendering with dynamic column/row counts
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
  }, [data, popularBlocks, columnCount]);
  
  // Helper function to replace a video with an ad at a specific position
  const insertAdvertisement = (items: Video[] = [], adPosition: number = 0) => {
    // Deep copy the array to avoid modifying the original
    const result = [...(items || [])];
    // Adjust position if it exceeds array length
    const position = Math.min(adPosition, result.length - 1);
    // Replace the item at the position with null (to be rendered as an ad)
    if (result.length > 0) {
      result[position] = null as unknown as Video;
    }
    return result;
  };

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
