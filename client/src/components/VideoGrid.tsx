import { Video as TypeVideo } from "@shared/schema";
import VideoCard from "./VideoCard";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
// Import loader component
import { Loader2 } from "lucide-react";

type Video = TypeVideo;

interface VideoGridProps {
  title: string;
  videos: Video[];
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
  showViewAll?: boolean;
  viewAllUrl?: string;
}

export default function VideoGrid({
  title,
  videos,
  onPreview,
  onWishlist,
  showViewAll = true,
  viewAllUrl = "#",
}: VideoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failedThumbnails, setFailedThumbnails] = useState<number[]>([]);
  const [visibleVideos, setVisibleVideos] = useState<Video[]>([]);
  const [columnCount, setColumnCount] = useState(2); // Default to 2 columns
  const [columnClass, setColumnClass] = useState('grid-cols-2');
  
  // Force exactly 3 rows of content
  const rowCount = 3;
  
  // Filter out videos with failed thumbnails when needed
  useEffect(() => {
    // Remove any videos with failed thumbnails from the visible set
    const filteredVideos = videos.filter(video => !failedThumbnails.includes(video.id));
    
    // Calculate items to show (3 rows * columns)
    const itemsToShow = Math.min(filteredVideos.length, columnCount * rowCount);
    
    // Set the videos to be shown
    setVisibleVideos(filteredVideos.slice(0, itemsToShow));
    
    // After loading content, mark as loaded
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [videos, failedThumbnails, columnCount]);
  
  // Handle thumbnail loading failures
  const handleThumbnailError = (videoId: number) => {
    if (!failedThumbnails.includes(videoId)) {
      setFailedThumbnails(prev => [...prev, videoId]);
      
      // Trigger grid reflow
      if (gridRef.current) {
        // Use requestAnimationFrame to ensure the DOM has updated
        requestAnimationFrame(() => {
          gridRef.current?.dispatchEvent(new Event('reflow'));
        });
      }
    }
  };
  
  // Generate array of indices for proper grid layout
  const totalGridSpots = columnCount * rowCount;
  const visibleCount = visibleVideos.length;
  const gridIndices = Array.from({ length: totalGridSpots }, (_, i) => i < visibleCount ? i : -1);

  // Update column class based on window resize
  useEffect(() => {
    const updateColumnClass = () => {
      // Get window width
      const width = window.innerWidth;
      if (width < 640) {
        setColumnClass('grid-cols-1');
        setColumnCount(1);
      }
      else if (width < 768) {
        setColumnClass('grid-cols-1');
        setColumnCount(1);
      }
      else if (width < 1024) {
        setColumnClass('grid-cols-2');
        setColumnCount(2);
      }
      else if (width < 1536) {
        setColumnClass('grid-cols-3');
        setColumnCount(3);
      }
      else {
        setColumnClass('grid-cols-4');
        setColumnCount(4);
      }
    };

    // Set initial value
    updateColumnClass();

    // Add event listener
    window.addEventListener('resize', updateColumnClass);

    // Cleanup
    return () => window.removeEventListener('resize', updateColumnClass);
  }, []);

  // Create a dynamic class that adjusts to screen width
  return (
    <section className="mb-8">
      {/* Pornhub-style heading with "view more" link */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold uppercase">{title}</h2>
        {showViewAll && visibleVideos.length > 0 && (
          <Link to={viewAllUrl} className="text-primary text-sm hover:text-primary/80 uppercase font-bold">
            MORE <span className="ml-1 text-xs">▶</span>
          </Link>
        )}
      </div>

      {isLoading ? (
        // Show loading state
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        // Video grid with responsive columns and error handling
        <div 
          ref={gridRef}
          className={`grid ${columnClass} gap-6 auto-rows-fr grid-flow-dense max-w-[2400px] mx-auto`}
          // Listen for reflow events to handle grid adjustments after failures
          onAnimationEnd={() => console.log('Grid animation completed')}
        >
          {paddedVideos.map((video, index) => 
            video ? (
              <VideoCard
                key={video.id}
                video={video}
                onPreview={onPreview}
                onWishlist={onWishlist}
              />
            ) : (
              <div key={`empty-${index}`} className="hidden" />
            )
          )}
        </div>
      )}
    </section>
  );
}