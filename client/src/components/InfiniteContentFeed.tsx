import { useEffect, useState, useRef, useCallback } from 'react';
import VideoGrid from './VideoGrid';
import ImageGallery from './ImageGallery';
import VideoCard from './VideoCard';
import { Video } from '@/types';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface InfiniteContentFeedProps {
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
  category?: string;
  sortBy?: 'newest' | 'oldest' | 'viewed';
}

export default function InfiniteContentFeed({ 
  onPreview, 
  onWishlist,
  category = '',
  sortBy = 'newest'
}: InfiniteContentFeedProps) {
  const [contentBlocks, setContentBlocks] = useState<Array<{
    type: 'videos' | 'images';
    items: Video[];
    id: number;
    title: string;
  }>>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const isMobile = useIsMobile();
  
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
        sortBy: sortBy
      });
      
      // Add category parameter if it exists and is not empty
      if (category) {
        params.append('category', category);
      }
      
      const response = await fetch(`/api/content/infinite?${params.toString()}`);
      
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
  }, [category, sortBy]);

  // Reset page and reload content when category or sortBy changes
  useEffect(() => {
    setPage(1);
    setContentBlocks([]);
    setIsInitialLoad(true);
    fetchContentBlocks(1);
  }, [category, sortBy, fetchContentBlocks]);
  
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
  const limitToSingleRow = (items: Video[]) => {
    // For smaller screens (<768px), we want to show 2-3 items
    // For medium screens (768px-1280px), we want to show 3-4 items
    // For larger screens (>1280px), we want to show 5 items
    const itemCount = Math.min(items.length, itemsPerRow);
    return items.slice(0, itemCount);
  };
  
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
            
            // For section titles based on block types
            const sectionTitle = block.type === 'videos' 
              ? (index === 0 ? "Trending Now" : "Recently Uploaded Videos") 
              : "AI-Generated Images";
            
            return (
              <section 
                key={`${block.type}-${block.id}`} 
                className={isContentTypeTransition ? "mt-16 mb-10" : "mb-10"}
              >
                <h3 className="text-2xl font-bold mb-6">{sectionTitle}</h3>
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${block.type === 'videos' ? 'md:grid-cols-3 gap-6' : 'md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                  {block.items.map(item => (
                    <VideoCard
                      key={item.id}
                      video={item}
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
          
          {!hasMore && (
            <div className="py-6 text-center text-muted-foreground">
              You've reached the end of the content
            </div>
          )}
        </>
      )}
    </div>
  );
}