import { useEffect, useState, useRef, useCallback } from 'react';
import VideoGrid from './VideoGrid';
import ImageGallery from './ImageGallery';
import { Video } from '@/types';
import { Loader2 } from 'lucide-react';

const VIDEOS_PER_ROW = 5; // Approximate number of videos per row
const ITEMS_PER_IMAGE_ROW = 5; // Approximate number of images per row

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

  return (
    <div className="space-y-8">
      {isInitialLoad ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {contentBlocks.map((block) => (
            <div key={block.id} className="mb-10">
              {block.type === 'videos' ? (
                <VideoGrid
                  title={block.title}
                  videos={block.items}
                  onPreview={onPreview}
                  onWishlist={onWishlist}
                />
              ) : (
                <ImageGallery
                  title={block.title}
                  images={block.items}
                  onPreview={onPreview}
                  onWishlist={onWishlist}
                />
              )}
            </div>
          ))}
          
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