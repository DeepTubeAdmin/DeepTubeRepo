import { Video as TypeVideo } from "@shared/schema";
import VideoCard from "./VideoCard";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
// Import loader component
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";

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
  const [visibleVideos, setVisibleVideos] = useState<Video[]>([]);
  const [columnCount, setColumnCount] = useState(2); // Default to 2 columns
  const [columnClass, setColumnClass] = useState('grid-cols-2');
  
  // Force exactly 3 rows of content
  const rowCount = 3;
  
  // Use valid videos only and handle video loading
  useEffect(() => {
    // Ensure we have valid video entries
    const validVideos = videos.filter(video => {
      return video && typeof video.id === 'number' && video.thumbnail;
    });
    
    // Calculate how many items we need to fill the grid completely
    const neededCount = columnCount * rowCount;
    
    // If we don't have enough videos to fill the grid completely
    let videosToShow = [];
    
    if (validVideos.length === 0) {
      // No valid videos at all
      setVisibleVideos([]);
    } else if (validVideos.length >= neededCount) {
      // We have enough videos to fill the grid
      videosToShow = validVideos.slice(0, neededCount);
      setVisibleVideos(videosToShow);
    } else {
      // Not enough videos to fill the grid, repeat as needed
      // Create an array of the necessary size by repeating videos
      videosToShow = [];
      for (let i = 0; i < neededCount; i++) {
        videosToShow.push(validVideos[i % validVideos.length]);
      }
      setVisibleVideos(videosToShow);
    }
    
    // After loading content, mark as loaded
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [videos, columnCount]);

  // Update column count based on screen width
  useEffect(() => {
    const updateColumnClass = () => {
      const width = window.innerWidth;
      if (width < 640) {
        // Mobile: 1 column
        setColumnClass('grid-cols-1');
        setColumnCount(1);
      }
      else if (width < 768) {
        // Small tablet: 1 column
        setColumnClass('grid-cols-1');
        setColumnCount(1);
      }
      else if (width < 1024) {
        // Tablet: 1 column
        setColumnClass('grid-cols-1');
        setColumnCount(1);
      }
      else if (width < 1536) {
        // Desktop: 2 columns
        setColumnClass('grid-cols-2');
        setColumnCount(2);
      }
      else {
        // Large desktop: 3 columns
        setColumnClass('grid-cols-3');
        setColumnCount(3);
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
      {/* Heading with "view more" link */}
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
        // Video grid with guaranteed complete rows and error handling
        <div 
          ref={gridRef}
          className={`grid ${columnClass} gap-6 auto-rows-fr max-w-[2400px] mx-auto`}
        >
          {visibleVideos.map((video, index) => (
            <ErrorBoundary 
              key={`${video.id}-${index}`}
              fallback={
                <div className="bg-black/80 rounded-md aspect-video flex items-center justify-center text-orange-500 h-full">
                  <div className="text-center p-4">
                    <div className="text-3xl mb-2">⚠️</div>
                    <div>Content Unavailable</div>
                  </div>
                </div>
              }
            >
              <VideoCard
                key={`video-${video.id}-${index}`}
                video={video}
                onPreview={onPreview}
                onWishlist={onWishlist}
              />
            </ErrorBoundary>
          ))}
        </div>
      )}
    </section>
  );
}