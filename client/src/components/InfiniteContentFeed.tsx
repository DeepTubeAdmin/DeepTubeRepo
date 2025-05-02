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
  const loadingRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();
      
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      
      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore]
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
          return [...prev, ...data.blocks];
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
    
    // Analyze the items to find out where ads will be placed
    block.items.forEach((item: TypeVideo, itemIndex: number) => {
      const globalVideoIndex = blockStartIndex + itemIndex;
      const shouldShowAd = globalVideoIndex > 0 && (globalVideoIndex + 1) % 11 === 0;
      
      preparedItems.push({
        item,
        hasAd: shouldShowAd
      });
      
      if (shouldShowAd) {
        itemsWithAdIndices.push(itemIndex);
      }
    });
    
    // Special case for first two blocks (9 videos each) and regular blocks (3 videos per row)
    const isSpecialBlock = blockPosition === 0 || blockPosition === 1;
    const maxItemsToShow = isSpecialBlock ? 9 : 3; // 9 for special blocks, 3 for regular blocks
    
    // Adjust the items to ensure we don't exceed the limit when ads are included
    const totalItemsWithAds = preparedItems.length + itemsWithAdIndices.length;
    let itemsToRender = preparedItems;
    
    // If adding ads would exceed our limit, trim the content items to make room
    if (totalItemsWithAds > maxItemsToShow) {
      const itemsToRemove = totalItemsWithAds - maxItemsToShow;
      itemsToRender = preparedItems.slice(0, preparedItems.length - itemsToRemove);
    }
    
    // Now render the items with ads in the right places
    return itemsToRender.map(({ item, hasAd }, i) => (
      <React.Fragment key={`video-container-${item.id}`}>
        <VideoCard
          key={`video-${item.id}`}
          video={item}
          onPreview={onPreview}
          onWishlist={onWishlist}
        />
        
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
              key={`ad-after-${item.id}`}
              ad={ad} 
            />
          );
        })()}
      </React.Fragment>
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

    const handleClick = () => {
      console.log('ImageCard: handleClick called for image', image.id);
      if (onPreview) {
        console.log('ImageCard: Calling onPreview with image ID', image.id);
        onPreview(image.id);
      } else {
        console.log('ImageCard: onPreview prop is not provided');
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
            <img
              src={image.thumbnail || "https://via.placeholder.com/640x360?text=No+Thumbnail"}
              alt={image.title}
              className="object-cover w-full h-full transition-all duration-300 transform group-hover:scale-110"
            />
          </AspectRatio>
          
          {/* Remove AI watermark from thumbnails */}
          
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

  return (
    <div className="space-y-4">
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
            
            // Use the block's ID to create consistent section titles that don't change on re-render
            // This avoids issues with titles changing due to ad insertions
            if (block.type === 'videos') {
              if (index === 0) {
                sectionTitle = "Trending Now";
                // Show 3 rows for Trending Now
                if (block.items.length > 3) {
                  // Keep only the first 9 items (3 rows of 3)
                  block.items = block.items.slice(0, 9);
                }
              } else if (index === 1) {
                sectionTitle = "Recently Uploaded Videos";
                // Show 3 rows for Recently Uploaded
                if (block.items.length > 3) {
                  // Keep only the first 9 items (3 rows of 3)
                  block.items = block.items.slice(0, 9);
                }
              } else {
                // For subsequent video blocks, use the category from server if available
                if (block.categoryName) {
                  sectionTitle = `${block.categoryName} Videos`;
                } else {
                  // Use the block ID as a consistent seed for random categories
                  const categoryIndex = block.id % categories.length;
                  const category = categories[categoryIndex >= 0 && categoryIndex < categories.length ? categoryIndex : 0];
                  sectionTitle = category ? `${category.name} Videos` : "Entertainment Videos";
                }
              }
            } else {
              // For image blocks based on position
              if (index === 3) {
                sectionTitle = "Trending Images";
              } else if (index === 7) {
                sectionTitle = "Most Viewed Images";
              } else {
                // For other image blocks, use the category from server if available
                if (block.categoryName) {
                  sectionTitle = `${block.categoryName} Images`;
                } else {
                  // Use the block ID as a consistent seed for random categories
                  const categoryIndex = block.id % categories.length;
                  const category = categories[categoryIndex >= 0 && categoryIndex < categories.length ? categoryIndex : 0];
                  sectionTitle = category ? `${category.name} Images` : "Entertainment Images";
                }
              }
            }
            
            return (
              <section 
                key={`${block.type}-${block.id}`} 
                className={isContentTypeTransition ? "mt-16 mb-10" : "mb-10"}
              >
                <h3 className="text-2xl font-bold mb-6">{sectionTitle}</h3>
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${block.type === 'videos' ? 'md:grid-cols-3 gap-6' : 'md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                  {block.type === 'videos' && renderVideoBlock(block, index, block.id)}
                  {block.type === 'images' && block.items.map(item => (
                    <ImageCard
                      key={item.id}
                      image={item}
                      onPreview={onPreview}
                      onWishlist={onWishlist}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          
          {hasMore && (
            <div 
              ref={loadingRef} 
              className="py-6 flex justify-center"
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