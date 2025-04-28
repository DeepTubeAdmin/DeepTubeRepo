import { useEffect, useState, useRef, useCallback } from 'react';
import VideoGrid from './VideoGrid';
import ImageGallery from './ImageGallery';
import { Video } from '@/types';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface InfiniteContentFeedProps {
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function InfiniteContentFeed({ onPreview, onWishlist }: InfiniteContentFeedProps) {
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
    if (isMobile) return 2; // Mobile: 2 items per row
    if (window.innerWidth < 768) return 3; // Small tablets: 3 items
    if (window.innerWidth < 1024) return 4; // Tablets: 4 items
    if (window.innerWidth < 1280) return 5; // Small desktop: 5 items
    return 6; // Large desktop: 6 items
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
      const response = await fetch(`/api/content/infinite?page=${currentPage}&pageSize=5`);
      
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
  }, []);

  // Initial load and pagination
  useEffect(() => {
    fetchContentBlocks(page);
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
  
  // Function to limit items to single row
  const limitToSingleRow = (items: Video[]) => {
    return items.slice(0, itemsPerRow);
  };
  
  return (
    <div className="space-y-8">
      {isInitialLoad ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {contentBlocks.map((block) => {
            // Limit items to what fits in a single row based on screen size
            const limitedItems = limitToSingleRow(block.items);
            
            return (
              <div key={block.id} className="mb-10">
                {block.type === 'videos' ? (
                  <VideoGrid
                    title={block.title}
                    videos={limitedItems}
                    onPreview={onPreview}
                    onWishlist={onWishlist}
                  />
                ) : (
                  <ImageGallery
                    title={block.title}
                    images={limitedItems}
                    onPreview={onPreview}
                    onWishlist={onWishlist}
                  />
                )}
              </div>
            );
          })}
          
          {hasMore && (
            <div 
              ref={loadingRef} 
              className="py-8 flex justify-center"
            >
              {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            </div>
          )}
          
          {!hasMore && (
            <div className="py-8 text-center text-muted-foreground">
              You've reached the end of the content
            </div>
          )}
        </>
      )}
    </div>
  );
}