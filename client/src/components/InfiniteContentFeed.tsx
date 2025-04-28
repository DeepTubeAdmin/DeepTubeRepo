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

  // Function to generate fake content blocks for demonstration
  // In a real app, this would fetch from API with proper pagination
  const generateContentBlocks = useCallback((currentPage: number) => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Pattern: 3 video rows, then 2 image rows, repeat
      const newBlocks: Array<{
        type: 'videos' | 'images';
        items: Video[];
        id: number;
        title: string;
      }> = [];
      const baseIndex = (currentPage - 1) * 5; // 5 blocks per page (3 video + 2 image)
      
      // Generate 3 video rows
      for (let i = 0; i < 3; i++) {
        const blockId = baseIndex + i;
        newBlocks.push({
          type: 'videos' as const,
          id: blockId,
          title: `AI Videos - Section ${blockId + 1}`,
          // Generate random videos
          items: Array(VIDEOS_PER_ROW).fill(0).map((_, idx) => ({
            id: blockId * 100 + idx,
            title: `AI Generated Video ${blockId * 100 + idx}`,
            thumbnail: `https://picsum.photos/seed/${blockId * 100 + idx}/400/225`,
            credits: Math.floor(Math.random() * 50) + 10,
            resolution: Math.random() > 0.3 ? "HD" : "4K",
            duration: Math.floor(Math.random() * 300) + 30,
            category: "Animation",
            // Add some random Vimeo IDs for demonstration
            vimeoId: Math.random() > 0.7 ? '824804225' : undefined,
          })),
        });
      }
      
      // Generate 2 image rows
      for (let i = 0; i < 2; i++) {
        const blockId = baseIndex + 3 + i;
        newBlocks.push({
          type: 'images' as const,
          id: blockId,
          title: `AI Image Gallery - Collection ${blockId + 1}`,
          // Generate random images
          items: Array(ITEMS_PER_IMAGE_ROW).fill(0).map((_, idx) => ({
            id: blockId * 100 + idx,
            title: `AI Generated Image ${blockId * 100 + idx}`,
            thumbnail: `https://picsum.photos/seed/${blockId * 100 + idx + 500}/400/400`,
            credits: Math.floor(Math.random() * 30) + 5,
            resolution: Math.random() > 0.5 ? "HD" : "4K",
            duration: 0,
            category: "Art",
            contentType: "image",
          })),
        });
      }
      
      setContentBlocks(prev => {
        if (currentPage === 1) {
          return newBlocks;
        } else {
          return [...prev, ...newBlocks];
        }
      });
      
      setIsLoading(false);
      setIsInitialLoad(false);
      
      // For demo purposes, limit to 10 pages
      if (currentPage >= 10) {
        setHasMore(false);
      }
    }, 1000);
  }, []);

  // Initial load and pagination
  useEffect(() => {
    generateContentBlocks(page);
  }, [page, generateContentBlocks]);

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