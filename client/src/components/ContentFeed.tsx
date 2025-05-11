import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import VideoCard from './VideoCard';
import ImageCard from './ImageCard';
import AdvertisementCard from './AdvertisementCard';
import { Loader2, Filter, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShuffleContext } from '@/App';
import { Video } from '@shared/schema';

interface ContentFeedProps {
  categorySlug?: string;
}

type SortOption = 'newest' | 'oldest' | 'most-viewed' | 'trending' | 'popular';

// Updated response interface for new content feed structure
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

export default function ContentFeed({ categorySlug }: ContentFeedProps) {
  // Get shuffle context
  const { shuffleSeed: contextShuffleSeed, triggerShuffle } = useContext(ShuffleContext);
  
  // State hooks - all defined at the top level
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [columnCount, setColumnCount] = useState(3); // Default to 3 columns for large screens
  const [loadedVideos, setLoadedVideos] = useState<Video[]>([]);
  const [loadedImages, setLoadedImages] = useState<Video[]>([]);
  const [adPositions, setAdPositions] = useState<number[]>([]);

  // Ref hooks - all defined at the top level
  const previousDataRef = useRef<ContentFeedResponse | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const isInitialMount = useRef(true);

  // Generate a new shuffle seed on every mount (page refresh) or use URL parameter if available
  const [localShuffleSeed, setLocalShuffleSeed] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Priority 1: Use URL shuffleSeed parameter if available
    if (urlParams.has('shuffleSeed')) {
      return urlParams.get('shuffleSeed') || '';
    } 
    // Priority 2: Use URL shuffle parameter for backward compatibility
    else if (urlParams.has('shuffle')) {
      return urlParams.get('shuffle') || '';
    }
    // Priority 3: Generate a new random seed for every page refresh
    else {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const newSeed = `refresh-${timestamp.toString(36)}-${random}`;
      console.log('ContentFeed: Generated new shuffle seed on mount:', newSeed);
      return newSeed;
    }
  });

  // Always use shuffleSeed in the query key, regardless of URL parameters
  const queryKey = useMemo(() => {
    return ['/api/content/feed', { 
      page, 
      category: categorySlug || '', 
      // Always include shuffle seed for randomization on every page load
      shuffleSeed: localShuffleSeed,
      sortBy,
      // Use current timestamp to prevent caching
      timestamp: Date.now() 
    }];
  }, [page, categorySlug, localShuffleSeed, sortBy]);

  // Data fetching with TanStack Query
  const { data, isLoading, isError } = useQuery<ContentFeedResponse>({
    queryKey,
    placeholderData: previousDataRef.current,
  });
  
  // Clean up URL parameters after data has been loaded
  useEffect(() => {
    if (data && !isLoading) {
      const urlParams = new URLSearchParams(window.location.search);
      const hasUrlParams = urlParams.has('shuffleSeed') || urlParams.has('shuffle');
      
      if (hasUrlParams && window.history.replaceState) {
        console.log('Clean up URL parameters after data has been loaded');
        
        // Remove both types of shuffle params for consistency
        if (urlParams.has('shuffleSeed')) {
          urlParams.delete('shuffleSeed');
        }
        if (urlParams.has('shuffle')) {
          urlParams.delete('shuffle');
        }
        
        const newUrl = urlParams.toString() ? `/?${urlParams.toString()}` : '/';
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [data, isLoading]);

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
  const renderContent = useMemo(() => {
    if (!loadedVideos.length && !loadedImages.length) return null;
    
    // Create chunks of content that alternate between 4 video rows and 2 image rows
    const videoChunkSize = 4 * columnCount; // 4 rows of videos
    const imageChunkSize = 2 * columnCount; // 2 rows of images
    
    const videoChunks: Video[][] = [];
    const imageChunks: Video[][] = [];
    
    // Split videos into chunks of 4 rows
    for (let i = 0; i < loadedVideos.length; i += videoChunkSize) {
      videoChunks.push(loadedVideos.slice(i, i + videoChunkSize));
    }
    
    // Split images into chunks of 2 rows
    for (let i = 0; i < loadedImages.length; i += imageChunkSize) {
      imageChunks.push(loadedImages.slice(i, i + imageChunkSize));
    }
    
    // Combine into merged chunks where each chunk has 4 rows of videos and 2 rows of images
    const contentChunks = [];
    const maxChunks = Math.max(videoChunks.length, imageChunks.length);
    
    for (let i = 0; i < maxChunks; i++) {
      contentChunks.push({
        videos: videoChunks[i] || [],
        images: imageChunks[i] || [],
        hasAd: adPositions.includes(i),
        adPosition: i,
      });
    }
    
    return contentChunks;
  }, [loadedVideos, loadedImages, adPositions, columnCount]);

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

  // Effect for handling content updates
  useEffect(() => {
    if (data?.content) {
      if (page === 1) {
        // Reset content on first page
        setLoadedVideos(data.content.videos);
        setLoadedImages(data.content.images);
        setAdPositions(data.content.adPositions);
      } else {
        // Append new content for subsequent pages
        setLoadedVideos(prev => [...prev, ...data.content.videos]);
        setLoadedImages(prev => [...prev, ...data.content.images]);
        setAdPositions(prev => [...prev, ...data.content.adPositions]);
      }
    }
  }, [data, page]);
  
  // This effect handles both URL parameters and automatic shuffling on page refresh
  useEffect(() => {
    function handleShuffleProcess() {
      // Check URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const hasShuffleSeedParam = urlParams.has('shuffleSeed');
      const shuffleSeedValue = urlParams.get('shuffleSeed');
      const hasShuffleParam = !hasShuffleSeedParam && urlParams.has('shuffle');
      const shuffleValue = hasShuffleParam ? urlParams.get('shuffle') : null;
      
      // If the shuffle is coming from URL parameters
      if ((hasShuffleSeedParam || hasShuffleParam) && (shuffleSeedValue || shuffleValue)) {
        const finalShuffleValue = shuffleSeedValue || shuffleValue || '';
        console.log('ContentFeed: Processing explicit shuffle from URL with seed:', finalShuffleValue);
        
        // Update local shuffle seed to match URL parameter
        setLocalShuffleSeed(finalShuffleValue);
        
        // Reset UI state
        setPage(1);
        setPopularBlocks([]);
        setSortBy('trending');
        
        // Force data refresh
        queryClient.invalidateQueries({ queryKey: ['/api/content/feed'] });
      } 
      // If we're on mount (first page load)
      else if (isInitialMount.current) {
        isInitialMount.current = false;
        
        // If no URL parameter, we've already created a new random seed in the useState initializer
        console.log('ContentFeed: Using initial page load shuffle with seed:', localShuffleSeed);
        
        // Reset UI state
        setPage(1);
        setPopularBlocks([]);
        setSortBy('trending');
        
        // Force data refresh on initial mount
        queryClient.invalidateQueries({ queryKey: ['/api/content/feed'] });
      }
    }
    
    // Run the handling on mount
    handleShuffleProcess();
    
    // Also set up a listener for URL changes (back/forward navigation)
    const handleUrlChange = () => {
      handleShuffleProcess();
    };
    
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [localShuffleSeed]);

  // Effect for detecting screen size and updating column count
  useEffect(() => {
    function updateColumnCount() {
      // Match the requested breakpoints
      if (window.innerWidth >= 1536) { // 2xl breakpoint
        // Large desktop: 3 columns
        setColumnCount(3);
      } 
      else if (window.innerWidth >= 1024) { // lg breakpoint
        // Desktop: 2 columns
        setColumnCount(2);
      } 
      else {
        // Mobile, small tablet, tablet: 1 column
        setColumnCount(1);
      }
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
          <div className="max-w-4xl mx-auto">
            {data.featured.video && <VideoCard video={data.featured.video} size="large" />}
            {!data.featured.video && (
              <div className="p-8 bg-gray-800 rounded-lg text-center">
                <p className="text-white mb-2">Featured content is currently unavailable</p>
                <p className="text-orange-500 text-sm">Check back later for featured videos</p>
              </div>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
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
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              {block.images && block.images.length > 0 && block.images.map((image, index) => (
                image && <ImageCard key={`popular-image-${image.id}-${index}-${blockIndex}`} image={image} />
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