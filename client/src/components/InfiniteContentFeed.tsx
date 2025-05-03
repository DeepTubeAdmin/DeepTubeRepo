import React, { useEffect, useState, useRef, useCallback } from 'react';
import VideoGrid from './VideoGrid';
import ImageGallery from './ImageGallery';
import VideoCard from './VideoCard';
import AdvertisementCard, { getRandomAd } from './AdvertisementCard';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ExternalLink, Heart, Image } from 'lucide-react';
import { Video as TypeVideo, Category } from '@/types';
import { Video as SchemaVideo } from '@shared/schema';
import { Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { checkThumbnail } from '@/lib/checkThumbnail';
import ErrorBoundary from './ErrorBoundary';

interface InfiniteContentFeedProps {
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
  category?: string;
  sortBy?: 'newest' | 'oldest' | 'most-viewed' | 'trending' | 'popular';
  shuffleSeed?: string;
}

export default function InfiniteContentFeed({ 
  onPreview, 
  onWishlist,
  category = '',
  sortBy = 'trending', // Default to trending for initial load
  shuffleSeed = Math.random().toString(36).substring(2, 8) // Default random seed if not provided
}: InfiniteContentFeedProps) {
  // Reference to the main container for direct DOM manipulation
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentBlocks, setContentBlocks] = useState<Array<{
    type: 'videos' | 'images';
    items: TypeVideo[];
    id: number;
    title: string;
    categoryName?: string;
  }>>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // We use the shuffleSeed passed as a prop now instead of generating it here
  // Keep track of advertisements to ensure unique ads per session
  const [usedAdIds, setUsedAdIds] = useState<Set<string>>(new Set());
  const observer = useRef<IntersectionObserver | null>(null);
  const isMobile = useIsMobile();

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }

    fetchCategories();
  }, []);

  // Determine how many items should be shown per row based on screen size
  const getItemsPerRow = () => {
    if (isMobile) return 1; // Mobile: 1 item per row
    if (window.innerWidth < 768) return 2; // Small tablets: 2 items
    if (window.innerWidth < 1024) return 3; // Tablets: 3 items
    if (window.innerWidth < 1280) return 4; // Small desktop: 4 items
    return 5; // Large desktop: 5 items
  };
  
  // Calculate how many videos to show for featured sections (3 rows)
  const getItemsForThreeRows = (type: 'videos' | 'images'): number => {
    if (type === 'videos') {
      // For video sections we want columns * 3 (rows)
      if (isMobile) return 3; // 1 column * 3 rows
      if (window.innerWidth < 768) return 6; // 2 columns * 3 rows
      return 6; // 2 columns * 3 rows (larger screens - we keep 2 columns for videos)
    } else {
      // For image sections we want columns * 3 (rows)
      if (isMobile) return 3; // 1 column * 3 rows
      if (window.innerWidth < 768) return 6; // 2 columns * 3 rows
      if (window.innerWidth < 1024) return 9; // 3 columns * 3 rows
      return 12; // 4 columns * 3 rows (larger screens)
    }
  };
  const loadingRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          // Immediately apply spacing fixes at the boundary, before load
          if (containerRef.current) {
            const popularSection = containerRef.current.querySelector('.popular-content');
            
            if (popularSection) {
              // Specifically target the space after the Popular Content section
              let sibling = popularSection.nextElementSibling;
              while (sibling) {
                const element = sibling as HTMLElement;
                // Super aggressive styling to eliminate any gaps
                element.style.marginTop = '0';
                element.style.paddingTop = '0';
                element.style.marginBottom = '0';
                element.style.paddingBottom = '0';
                element.style.position = 'relative';
                element.style.top = '-24px';
                sibling = sibling.nextElementSibling;
              }
              
              // Move the loading indicator up as well to prevent gaps
              const loadingIndicator = containerRef.current.querySelector('.loading-indicator');
              if (loadingIndicator) {
                const loadingElement = loadingIndicator as HTMLElement;
                loadingElement.style.marginTop = '-24px';
                loadingElement.style.position = 'relative';
              }
            }
          }
          
          // Now load more content
          setPage((prevPage) => prevPage + 1);
          
          // Apply aggressive spacing fixes after new content is loaded
          setTimeout(() => {
            // Apply immediate spacing fixes at the spot where new content will be added
            if (containerRef.current) {
              // 1. Fix all non-titled sections to have no top margin/padding
              const sections = containerRef.current.querySelectorAll('section:not(.has-title)');
              sections.forEach((section, i) => {
                if (i > 0) {
                  // Make sure all non-titled sections have zero gap with the previous section
                  const sectionElement = section as HTMLElement;
                  sectionElement.style.marginTop = '0';
                  sectionElement.style.paddingTop = '0';
                }
              });
              
              // 2. Specifically target the sections after popular content
              const popularSection = containerRef.current.querySelector('.popular-content');
              if (popularSection) {
                let sibling = popularSection.nextElementSibling;
                while (sibling) {
                  // Force all subsequent siblings to have zero top spacing
                  const element = sibling as HTMLElement;
                  element.style.marginTop = '0';
                  element.style.paddingTop = '0';
                  sibling = sibling.nextElementSibling;
                }
              }
              
              // 3. Fix any gaps between all sections after the third one
              const allSections = containerRef.current.querySelectorAll('section');
              if (allSections.length > 3) {
                for (let i = 3; i < allSections.length; i++) {
                  // Apply direct style to all sections after the third one
                  const section = allSections[i] as HTMLElement;
                  section.style.marginTop = '0';
                  section.style.paddingTop = '0';
                }
              }
            }
          }, 300); // Slightly longer delay to ensure DOM updates completely
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore, containerRef]
  );

  // Fetch content blocks from our API
  const fetchContentBlocks = useCallback(async (currentPage: number) => {
    setIsLoading(true);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '5',
        sortBy: sortBy,
        shuffleSeed: shuffleSeed
      });

      // Add category parameter if it exists and is not empty
      if (category) {
        params.append('category', category);
      }

      const apiUrl = `/api/content/infinite?${params.toString()}`;
      console.log('Fetching content from:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();

      setContentBlocks(prev => {
        if (currentPage === 1) {
          return data.blocks;
        } else {
          // Apply special transforms to prevent gaps when adding new blocks
          // by modifying the incoming blocks before they're added to state
          const transformedBlocks = data.blocks.map((block: any, blockIndex: number) => {
            // Mark these blocks as dynamically loaded (page > 1)
            return {
              ...block,
              dynamicallyLoaded: true, // Add a flag to identify dynamically loaded blocks
            };
          });
          return [...prev, ...transformedBlocks];
        }
      });

      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [category, sortBy, shuffleSeed]);

  // Reset page and reload content when category, sortBy or shuffle seed changes
  useEffect(() => {
    console.log('InfiniteContentFeed: content criteria changed', { category, sortBy, shuffleSeed });
    setPage(1);
    setContentBlocks([]);
    setIsInitialLoad(true);
    fetchContentBlocks(1);
  }, [category, sortBy, shuffleSeed, fetchContentBlocks]);

  // Load more content when scrolling
  useEffect(() => {
    if (page > 1) {
      fetchContentBlocks(page);
    }
  }, [page, fetchContentBlocks]);

  // Use effect to handle window resize and update items per row
  const [itemsPerRow, setItemsPerRow] = useState(getItemsPerRow());

  useEffect(() => {
    const handleResize = () => {
      setItemsPerRow(getItemsPerRow());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Function to determine how many items should be displayed
  // This now provides enough items to fill the grid while accounting
  // for the responsive design that handles actually showing the items
  const limitToSingleRow = (items: TypeVideo[]) => {
    // For smaller screens (<768px), we want to show 2-3 items
    // For medium screens (768px-1280px), we want to show 3-4 items
    // For larger screens (>1280px), we want to show 5 items
    const itemCount = Math.min(items.length, itemsPerRow);
    return items.slice(0, itemCount);
  };

  // Function to get a unique random advertisement
  // Use useCallback to memoize the function and prevent re-renders
  const getUniqueRandomAd = useCallback(() => {
    let ad = getRandomAd();
    let attempts = 0;

    // Try to find an ad that hasn't been used yet
    // But limit attempts to avoid infinite loop if all ads have been used
    while (usedAdIds.has(ad.id) && attempts < 10) {
      ad = getRandomAd();
      attempts++;
    }

    // We'll update the usedAdIds in a useEffect to avoid render loops
    return ad;
  }, [usedAdIds]);

  // Track the ads that are displayed in the current view
  const [displayedAds, setDisplayedAds] = useState<string[]>([]);

  // Update usedAdIds when displayedAds changes
  useEffect(() => {
    if (displayedAds.length > 0) {
      const newUsedAdIds = new Set(usedAdIds);
      displayedAds.forEach(id => newUsedAdIds.add(id));

      // If we've used all ads, reset the tracking
      if (newUsedAdIds.size >= 5) { // 5 is the number of sample ads we have
        setUsedAdIds(new Set());
      } else {
        setUsedAdIds(newUsedAdIds);
      }

      // Clear the displayed ads after processing
      setDisplayedAds([]);
    }
  }, [displayedAds]);

  // Function to render video blocks with ad control
  const renderVideoBlock = (block: any, blockIndex: number, blockPosition: number) => {
    // First, determine which items will have ads after them
    const itemsWithAdIndices: number[] = [];
    const preparedItems: { item: TypeVideo; hasAd: boolean }[] = [];

    // Calculate start index for the current block's videos
    const blockStartIndex = contentBlocks.slice(0, blockIndex).reduce((count, prevBlock) => {
      return prevBlock.type === 'videos' ? count + prevBlock.items.length : count;
    }, 0);

    // Check if we have valid items to work with
    if (!block.items || !Array.isArray(block.items) || block.items.length === 0) {
      console.warn("No valid items to render in video block", blockIndex);
      return [];
    }

    // Analyze the items to find out where ads will be placed - every 7 videos
    // But not within the first 3 rows for the featured sections
    block.items.forEach((item: TypeVideo, itemIndex: number) => {
      const globalVideoIndex = blockStartIndex + itemIndex;
      
      // Skip any invalid items
      if (!item || typeof item.id !== 'number') return;
      
      // Don't show ads within the special blocks to maintain clean 3-row layout
      const isSpecialBlock = blockPosition === 0 || blockPosition === 1 || blockPosition === 2;
      const isWithinThreeRows = isSpecialBlock && itemIndex < getItemsForThreeRows('videos');
      
      // Only show ads after every 7th video and not within the first 3 rows of special blocks
      const shouldShowAd = !isWithinThreeRows && globalVideoIndex > 0 && (globalVideoIndex + 1) % 7 === 0;
      
      preparedItems.push({
        item,
        hasAd: shouldShowAd
      });
      
      if (shouldShowAd) {
        itemsWithAdIndices.push(itemIndex);
      }
    });

    // Filter out any potential problematic items
    let itemsToRender = preparedItems.filter(item => {
      // Ensure the item has all required properties
      return item && item.item && typeof item.item.id === 'number';
    });
    
    // Make sure we have enough items to fill the grid nicely
    // For videos, calculate the needed count based on the screen width
    // Videos are displayed in a 1-column grid on small screens, 2-column on larger screens
    let columnsCount = 2; // Default for medium/large screens
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      columnsCount = 1;
    }
    
    // For Popular Content section, handle specially to never have blank spaces
    // We use a different approach for position 2 (Popular Content) to ensure no gaps
    if (blockPosition === 2) {
      // For Popular Content, we always want exactly 3 rows, no matter what
      const rowCount = 3;
      const targetCount = rowCount * columnsCount;
      
      // Duplicate items until we have enough to fill all rows
      if (itemsToRender.length < targetCount && itemsToRender.length > 0) {
        // Double the array repeatedly until we have enough items
        let extendedItems = [...itemsToRender];
        while (extendedItems.length < targetCount) {
          extendedItems = [...extendedItems, ...extendedItems];
        }
        
        // Trim to exact size needed for the rows
        itemsToRender = extendedItems.slice(0, targetCount);
      }
    }
    // For other sections, just fill in grid neatly
    else if (blockPosition <= 1 && itemsToRender.length > 0) { 
      // Make rows a multiple of columns count to fill the grid evenly
      const rowCount = Math.ceil(itemsToRender.length / columnsCount);
      const idealCount = rowCount * columnsCount;
      
      // Add filler items if needed by repeating existing items
      if (itemsToRender.length < idealCount) {
        const missingCount = idealCount - itemsToRender.length;
        const fillerItems = [];
        
        for (let i = 0; i < missingCount; i++) {
          // Copy an existing item as filler
          const original = itemsToRender[i % itemsToRender.length];
          fillerItems.push({
            item: {...original.item}, // Create a full copy to avoid reference issues
            hasAd: false // Don't add ads for filler items
          });
        }
        
        itemsToRender = [...itemsToRender, ...fillerItems];
      }
    }

    // Now render the items with ads in the right places
    return itemsToRender.map(({ item, hasAd }, index) => (
      <div key={`video-container-${item.id}-${index}`} className="video-container">
        <ErrorBoundary fallback={<div className="bg-black/80 rounded-md aspect-video flex items-center justify-center text-orange-500">Content Unavailable</div>}>
          <VideoCard
            key={`video-${item.id}-${index}`}
            video={item}
            onPreview={onPreview}
            onWishlist={onWishlist}
          />
        </ErrorBoundary>

        {/* Insert advertisement if needed */}
        {hasAd && (() => {
          // Get a random ad and track it in displayedAds
          const ad = getRandomAd();
          // Add this ad ID to be processed in the useEffect
          setTimeout(() => {
            setDisplayedAds(prev => [...prev, ad.id]);
          }, 0);
          return (
            <AdvertisementCard 
              key={`ad-after-${item.id}-${index}`}
              ad={ad} 
              contentType="videos" // Mark this as a video type advertisement
            />
          );
        })()}
      </div>
    ));
  };

  // Function to render image blocks with ad control
  const renderImageBlock = (block: any, blockIndex: number) => {
    // Prepare items with ad markers
    const preparedItems: { item: TypeVideo; hasAd: boolean }[] = [];

    // Check if we have valid items to work with
    if (!block.items || !Array.isArray(block.items) || block.items.length === 0) {
      console.warn("No valid items to render in image block", blockIndex);
      return [];
    }

    // Calculate start index for the current block's images
    const blockStartIndex = contentBlocks.slice(0, blockIndex).reduce((count, prevBlock) => {
      return prevBlock.type === 'images' ? count + prevBlock.items.length : count;
    }, 0);

    // No ads in image blocks
    block.items.forEach((item: TypeVideo, i: number) => {
      // Skip any invalid items
      if (!item || typeof item.id !== 'number') return;
      
      preparedItems.push({
        item,
        hasAd: false
      });
    });

    // For image grid, we want to ensure the number of items fits nicely in the grid
    // Our grid is 3 columns on medium screens and 4 columns on large screens
    let itemsToRender = preparedItems;

    // If this is one of the titled sections, ensure clean layout for the grid
    const isSpecialBlock = blockIndex < 3;

    if (isSpecialBlock) {
      // For special blocks, we'll make sure everything is filled properly without gaps
      // rather than truncating items and creating gaps
    }

    // Filter out any potential problematic items
    itemsToRender = itemsToRender.filter(item => {
      // Ensure the item has all required properties
      return item && item.item && typeof item.item.id === 'number';
    });
    
    // Make sure we have enough items to fill the grid nicely
    // Calculate the needed count based on the screen width
    // Images are displayed in a 2-column grid on small screens, 3-column on medium, 4-column on large
    let columnsCount = 4; // Default for large screens
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        columnsCount = 2;
      } else if (window.innerWidth < 1024) {
        columnsCount = 3;
      }
    }
    
    // Ensure the items count is a multiple of the columns count to avoid blank spaces
    // For special blocks (first 3), ensure we have exactly the needed number of rows
    let rowCount = Math.ceil(itemsToRender.length / columnsCount);
    if (isSpecialBlock) {
      // Force exactly 2 rows for images in special blocks
      rowCount = 2;
    }
    const idealCount = rowCount * columnsCount;
    
    // Add filler items if needed by repeating existing items
    if (itemsToRender.length > 0 && itemsToRender.length < idealCount) {
      const missingCount = idealCount - itemsToRender.length;
      const fillerItems = [];
      
      for (let i = 0; i < missingCount; i++) {
        // Copy an existing item as filler
        const original = itemsToRender[i % itemsToRender.length];
        fillerItems.push({
          item: {...original.item}, // Create a full copy to avoid reference issues
          hasAd: false // Don't add ads for filler items
        });
      }
      
      itemsToRender = [...itemsToRender, ...fillerItems];
    }
    
    return itemsToRender.map(({ item, hasAd }, index) => (
      <div key={`image-container-${item.id}-${index}`} className="image-container">
        <ErrorBoundary fallback={<div className="bg-black/80 rounded-md aspect-[3/4] flex items-center justify-center text-orange-500">Image Unavailable</div>}>
          <ImageCard
            key={`image-${item.id}-${index}`}
            image={item}
            onPreview={onPreview}
            onWishlist={onWishlist}
          />
        </ErrorBoundary>

        {/* Insert advertisement if needed */}
        {hasAd && (() => {
          // Get a random ad and track it in displayedAds
          const ad = getRandomAd();
          // Add this ad ID to be processed in the useEffect
          setTimeout(() => {
            setDisplayedAds(prev => [...prev, ad.id]);
          }, 0);
          return (
            <AdvertisementCard 
              key={`ad-after-image-${item.id}-${index}`}
              ad={ad} 
              contentType="images" // Mark this as an image type advertisement
            />
          );
        })()}
      </div>
    ));
  };

  // Image card component specifically for images in the infinite feed
  interface ImageCardProps {
    image: TypeVideo;
    onPreview?: (imageId: number) => void;
    onWishlist?: (imageId: number) => void;
  }

  function ImageCard({ image, onPreview, onWishlist }: ImageCardProps) {
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [imgSrc, setImgSrc] = useState(checkThumbnail(image.thumbnail || "", image.id));

    const handleClick = () => {
      if (onPreview) {
        onPreview(image.id);
      }
    };

    const handleWishlist = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsWishlisted(!isWishlisted);
      if (onWishlist) {
        onWishlist(image.id);
      }
    };

    const handleMouseEnter = () => {
      setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };
    
    // Handle image loading/error events
    const handleImageLoad = () => {
      setIsLoading(false);
    };
    
    const handleImageError = () => {
      console.error(`ImageCard: Error loading thumbnail for image ${image.id}`);
      // Use a forced SVG placeholder
      setImgSrc(`/api/videos/${image.id}/thumbnail?forcesvg=true&t=${Date.now()}`);
      setLoadFailed(true);
      setIsLoading(false);
    };

    return (
      <div 
        className="group transition-transform duration-200 overflow-hidden cursor-pointer rounded"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div className="relative">
          {/* Thumbnail with hover effect */}
          <AspectRatio ratio={3 / 4} className="bg-black">
            {isLoading && (
              <div className="w-full h-full absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-t-orange-500 border-orange-500/30 rounded-full animate-spin"></div>
              </div>
            )}
            {loadFailed && (
              <div className="w-full h-full absolute inset-0 bg-black/70 flex items-center justify-center z-5">
                <div className="w-12 h-12 text-orange-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
              </div>
            )}
            <img
              src={imgSrc}
              alt={image.title}
              className="object-cover w-full h-full transition-all duration-300 transform group-hover:scale-110"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ opacity: loadFailed ? 0.7 : 1 }} // Dim failed thumbnails but keep them visible
            />
          </AspectRatio>

          {/* View/info overlay - only shows on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          </div>
        </div>

        {/* Image info */}
        <div className="pt-2 pb-3 px-1 bg-[#0f172a]">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors cursor-pointer mr-2">
              {image.title}
            </h3>
            <Link to={`/media/${image.id}`} className="text-gray-400 hover:text-primary transition-colors">
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>

          <div className="flex justify-between items-center mt-1">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span>{image.aiGenerator || "AI Generated"}</span>
            </div>

            <button 
              onClick={handleWishlist}
              className="text-gray-400 hover:text-primary transition-colors"
            >
              <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  
  // Add a consistent style for all content blocks
  const blockStyles = {
    marginBottom: '0', // Reset margin to control it via CSS
    paddingBottom: '0', // Reset padding to control it via CSS
  };
  
  // Special styling for the Popular Content section
  const popularSectionStyles = {
    marginBottom: '24px', // Match the standard margin to eliminate extra spacing
  };
  
  // Add custom CSS to define a fixed gap between rows specifically for section blocks
  useEffect(() => {
    // Add custom CSS to ensure consistent row spacing
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Global spacing control */
      .content-feed-container section {
        margin-bottom: 24px !important;
      }
      
      /* Equal spacing for grid rows */
      .content-feed-container .grid {
        display: grid;
        row-gap: 24px !important;
        column-gap: 24px !important;
      }
      
      /* Control spacing within Popular Content specifically */
      .content-feed-container .popular-content .grid {
        row-gap: 24px !important;
      }
      
      /* Ensure non-grid items maintain spacing */
      .content-feed-container .video-container,
      .content-feed-container .image-container {
        margin-bottom: 0 !important;
      }
      
      /* First 3 titled sections have different spacing */
      .content-feed-container section.has-title {
        margin-bottom: 24px !important;
      }
      
      /* For non-titled sections (such as content after block 3) */
      .content-feed-container section:not(.has-title) {
        margin-bottom: 24px !important;
        padding-top: 0 !important;
      }
      
      /* Special handling for transition after titled to non-titled sections */
      .content-feed-container section.popular-content + section,
      .content-feed-container section.popular-content ~ section {
        margin-top: 0 !important;
        padding-top: 0 !important;
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
        position: relative !important;
        top: -24px !important; /* Negative offset to eliminate gap */
      }
      
      /* Special handling for dynamically loaded sections */
      .content-feed-container section.dynamically-loaded {
        margin-top: 0 !important;
        padding-top: 24px !important; /* Add proper padding for spacing */
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Fix for the first dynamically loaded section */
      .content-feed-container section:last-of-type:not(.popular-content) + section.dynamically-loaded {
        margin-top: 0 !important;
        padding-top: 24px !important; /* Add proper padding for spacing */
      }
      
      /* Critical fix for the loading indicator */
      .content-feed-container .loading-indicator {
        margin: 0 !important;
        padding: 24px 0 !important; /* Match the spacing of thumbnails */
        position: relative !important;
        z-index: 1 !important;
        height: 72px !important; /* Taller to accommodate padding */
      }
      
      /* Make sure there's no gap when new sections are appended */
      .content-feed-container section:not(.has-title) + section:not(.has-title),
      .content-feed-container section:nth-of-type(n+4):not(.has-title) {
        margin-top: 0 !important;
        padding-top: 0 !important;
      }
      
      /* Force zero margin on all newly loaded sections after page 1 */
      .content-feed-container section:nth-child(n+4):not(.has-title) {
        margin-top: 0 !important;
        padding-top: 0 !important;
      }
      
      /* Ensure all subsequent sections are properly spaced */
      .content-feed-container section + section:not(.has-title) {
        margin-top: 0 !important;
        padding-top: 0 !important;
      }
      
      /* Completely eliminate any gaps for sections appearing after content loads */
      .content-feed-container section:nth-child(n+3) {
        margin-top: 0 !important;
      }

      /* Special handling for section titles */
      .content-feed-container .section-title {
        margin-bottom: 24px !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Force equal spacing after component mounts
    const equalizeSpacing = () => {
      if (containerRef.current) {
        const sections = containerRef.current.querySelectorAll('section');
        sections.forEach((section, i) => {
          // Apply different spacing based on section type
          if (section.classList.contains('has-title')) {
            // Titled sections (first 3 sections)
            section.style.marginBottom = '24px';
          } else if (section.classList.contains('popular-content')) {
            // Special handling for Popular Content section
            section.style.marginBottom = '24px';
          } else {
            // All other sections (no titles)
            section.style.marginBottom = '24px';
            
            // Special case for sections after the third section
            if (i >= 3) {
              section.style.marginTop = '0';
              section.style.paddingTop = '0';
            }
          }
          
          // Special handling for section after Popular Content
          const previousSection = i > 0 ? sections[i-1] : null;
          
          // Check for a section right after Popular Content or any section after Popular Content
          const popularSection = containerRef.current ? containerRef.current.querySelector('.popular-content') : null;
          if (popularSection) {
            // Check if this section comes after the Popular Content section in the DOM
            let isAfterPopular = false;
            let currentNode = popularSection.nextElementSibling;
            
            while (currentNode && !isAfterPopular) {
              if (currentNode === section) {
                isAfterPopular = true;
              }
              currentNode = currentNode.nextElementSibling;
            }
            
            if (isAfterPopular) {
              // Any section that comes after Popular Content gets aggressive spacing treatment
              section.style.marginTop = '0';
              section.style.paddingTop = '0';
              section.style.marginBottom = '0';
              section.style.paddingBottom = '0';
              section.style.position = 'relative';
              section.style.top = '-24px';
            }
          }
          
          // Check for consecutive non-titled sections (both don't have 'has-title' class)
          if (previousSection && 
              !previousSection.classList.contains('has-title') && 
              !section.classList.contains('has-title')) {
            section.style.marginTop = '0';
            section.style.paddingTop = '0';
          }
          
          // Special handling for sections after any loading events
          if (i > 0 && i % 3 === 0) {
            // Every third section after loading should have zero margin/padding top
            section.style.marginTop = '0';
            section.style.paddingTop = '0';
          }
          
          // Find grid elements and enforce consistent row gaps
          const grid = section.querySelector('.grid');
          if (grid) {
            // @ts-ignore
            grid.style.rowGap = '24px';
            // @ts-ignore
            grid.style.columnGap = '24px';
          }
        });
      }
    };
    
    // Apply spacing adjustments after initial render and after any content load
    equalizeSpacing();
    
    // Clean up observer after the component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [contentBlocks]); // Re-run when content blocks change

  return (
    <div ref={containerRef} className="content-feed-container space-y-0"> {/* Container with reference and specific class */}
      {isInitialLoad ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {contentBlocks.map((block, index) => {
            // Determine if this is a transition between content types
            const isContentTypeTransition = index > 0 && 
              contentBlocks[index-1] && 
              contentBlocks[index-1].type !== block.type;

            // Get a random category for variety in section titles
            const getRandomCategory = () => {
              if (categories.length === 0) return "Entertainment";
              const randomIndex = Math.floor(Math.random() * categories.length);
              return categories[randomIndex].name;
            };

            // For section titles based on block types, position, and server-provided category
            let sectionTitle = "";
            let showSectionTitle = false;

            // Only show titles for the first three sections
            if (index === 0) {
              sectionTitle = "Trending Now";
              showSectionTitle = true;
              // Make sure we have exactly 3 rows of content for Trending Now
              if (block.items.length > 0) {
                // Use our new helper function to get exactly 3 rows of content
                const threeRowsCount = getItemsForThreeRows(block.type);
                const itemCount = Math.min(threeRowsCount, block.items.length * 2); // Allow duplicates if needed
                
                // If we don't have enough items to fill the rows, repeat items as needed
                if (itemCount > block.items.length) {
                  let filledItems = [...block.items];
                  while (filledItems.length < itemCount) {
                    // Add items from the beginning of the list to fill the rows
                    const itemsToAdd = block.items.slice(0, Math.min(itemCount - filledItems.length, block.items.length));
                    filledItems = [...filledItems, ...itemsToAdd];
                  }
                  block.items = filledItems;
                } else {
                  block.items = block.items.slice(0, itemCount);
                }
              }
            } else if (index === 1) {
              sectionTitle = "Recently Uploaded Videos";
              showSectionTitle = true;
              // Make sure we have exactly 3 rows of content for Recently Uploaded
              if (block.items.length > 0) {
                // Use our new helper function to get exactly 3 rows of content
                const threeRowsCount = getItemsForThreeRows(block.type);
                const itemCount = Math.min(threeRowsCount, block.items.length * 2); // Allow duplicates if needed
                
                // If we don't have enough items to fill the rows, repeat items as needed
                if (itemCount > block.items.length) {
                  let filledItems = [...block.items];
                  while (filledItems.length < itemCount) {
                    // Add items from the beginning of the list to fill the rows
                    const itemsToAdd = block.items.slice(0, Math.min(itemCount - filledItems.length, block.items.length));
                    filledItems = [...filledItems, ...itemsToAdd];
                  }
                  block.items = filledItems;
                } else {
                  block.items = block.items.slice(0, itemCount);
                }
              }
            } else if (index === 2) {
              sectionTitle = "Popular Content";
              showSectionTitle = true;
              
              // Make sure we have exactly 3 rows of content for this section
              if (block && block.items && Array.isArray(block.items) && block.items.length > 0) {
                // Use 6 items (2 columns × 3 rows) for this section
                const targetCount = 6;
                
                // Create a new array with duplicated items if needed
                let filledItems = [];
                
                // If we have at least one item, repeat it to fill the grid
                for (let i = 0; i < targetCount; i++) {
                  filledItems.push({...block.items[i % block.items.length]});
                }
                
                // Replace the block's items with our guaranteed-full array
                block.items = filledItems;
              }
            }

            // Determine if this is a dynamically loaded block (page > 1) and needs special styling
            // Use optional chaining to safely access the property that may not exist in TypeScript interface
            const isDynamicallyLoaded = block.dynamicallyLoaded === true || (block as any).dynamicallyLoaded === true;
            
            // Create specific style for the section based on its position and loading method
            let sectionStyle = {};
            if (index === 2) {
              // Popular content section
              sectionStyle = {...blockStyles, ...popularSectionStyles};
            } else if (isDynamicallyLoaded) {
              // Dynamically loaded blocks after page 1 need special styling
              sectionStyle = {
                ...blockStyles,
                marginTop: '0',
                paddingTop: '24px', // Add proper spacing between blocks
                position: 'relative',
                zIndex: 1
              };
            } else {
              // Standard blocks
              sectionStyle = blockStyles;
            }
            
            // Determine CSS classes based on section properties
            const sectionClasses = [
              showSectionTitle ? (isContentTypeTransition ? "mt-16 has-title" : "has-title") : "",
              index === 2 ? "popular-content" : "",
              isDynamicallyLoaded ? "dynamically-loaded" : ""
            ].filter(Boolean).join(" ");
            
            return (
              <section 
                key={`${block.type}-${block.id}`} 
                className={sectionClasses}
                style={sectionStyle}
              >
                {showSectionTitle && <h3 className="section-title text-2xl font-bold mb-6">{sectionTitle}</h3>}
                <div 
                  className={`grid auto-rows-auto ${block.type === 'videos' ? 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}
                  style={{ 
                    gap: '24px', // Enforce consistent gap size via inline style
                    rowGap: '24px', // Explicitly set row gap
                    columnGap: '24px', // Explicitly set column gap
                  }}
                >
                {/* Apply a direct style here to force flex-wrap prevention in case grid doesn't work */}
                  {block.type === 'videos' && renderVideoBlock(block, index, index)}
                  {block.type === 'images' && renderImageBlock(block, index)}
                </div>
              </section>
            );
          })}

          {hasMore && (
            <div 
              ref={loadingRef} 
              className="loading-indicator flex justify-center" 
              style={{ 
                margin: '0', 
                padding: '24px 0', /* Match the spacing of thumbnails */
                height: '72px', /* Taller to accommodate padding */
                overflow: 'hidden',
                position: 'relative',
                zIndex: 1
              }}
            >
              {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            </div>
          )}

          {/* We no longer show "end of content" message for true infinite scrolling */}
        </>
      )}
    </div>
  );
}