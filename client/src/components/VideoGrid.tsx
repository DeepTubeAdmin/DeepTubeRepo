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
  const getColumnClass = () => {
    // Get window width
    if (typeof window === 'undefined') return 'grid-cols-1';
    
    const width = window.innerWidth;
    if (width < 640) return 'grid-cols-1'; // Mobile
    if (width < 768) return 'grid-cols-2'; // Small tablets
    if (width < 1024) return 'grid-cols-4'; // Large tablets/small desktop
    if (width < 1280) return 'grid-cols-6'; // Medium desktop
    if (width < 1536) return 'grid-cols-7'; // Large desktop
    return 'grid-cols-8'; // Extra large desktop
  };

  // Create a dynamic class that adjusts to screen width
  const [columnClass, setColumnClass] = useState(getColumnClass());
  
  // Update column class when window is resized
  useEffect(() => {
    const handleResize = () => {
      setColumnClass(getColumnClass());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <section className="mb-4">
      <div className={`grid ${columnClass} gap-4 w-full`}>
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
