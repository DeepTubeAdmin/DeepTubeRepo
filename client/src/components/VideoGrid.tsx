import { Video } from "@/types";
import VideoCard from "./VideoCard";
import { Link } from "wouter";
import { useState, useEffect } from "react";

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
  // Filter out image content
  const filteredVideos = videos.filter(video => video.contentType !== "image");
  
  // Create a function to get the optimal column count based on available width
  // Increased column counts to match our increased items per row in the API
  const [columnClass, setColumnClass] = useState('grid-cols-3'); // Default to 3 columns
  
  // Update column class based on window resize
  useEffect(() => {
    const updateColumnClass = () => {
      // Get window width
      const width = window.innerWidth;
      if (width < 640) setColumnClass('grid-cols-1'); // Mobile
      else if (width < 768) setColumnClass('grid-cols-1'); // Small tablets
      else if (width < 1024) setColumnClass('grid-cols-2'); // Large tablets/small desktop
      else if (width < 1536) setColumnClass('grid-cols-2'); // Desktop
      else setColumnClass('grid-cols-3'); // Large screens - 3 per row
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
        {showViewAll && filteredVideos.length > 0 && (
          <Link to={viewAllUrl} className="text-primary text-sm hover:text-primary/80 uppercase font-bold">
            MORE <span className="ml-1 text-xs">▶</span>
          </Link>
        )}
      </div>
      
      {/* Video grid with responsive columns */}
      <div className={`grid ${columnClass} gap-4 max-w-[2400px] mx-auto`}>
        {filteredVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onPreview={onPreview}
            onWishlist={onWishlist}
          />
        ))}
        
        {/* Add empty placeholder items to fill the last row completely */}
        {filteredVideos.length > 0 && filteredVideos.length % (parseInt(columnClass.split('-')[2]) || 1) !== 0 && 
          Array.from({ length: parseInt(columnClass.split('-')[2]) - (filteredVideos.length % parseInt(columnClass.split('-')[2])) }).map((_, i) => (
            <div key={`placeholder-${i}`} className="h-0 invisible"></div>
          ))
        }
      </div>
    </section>
  );
}
