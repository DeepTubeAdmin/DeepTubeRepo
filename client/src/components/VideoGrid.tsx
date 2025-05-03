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
    if (width < 1024) return 'grid-cols-3'; // Large tablets/small desktop
    return 'grid-cols-3'; // Desktop sizes - restricting to 3 per row for YouTube-like appearance
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 max-w-[2400px] mx-auto">
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
