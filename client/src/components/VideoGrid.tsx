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
  // No longer filtering out images
  const filteredVideos = videos;

  // Create a function to get the optimal column count based on available width
  const [columnClass, setColumnClass] = useState('grid-cols-2'); // Default to 2 columns

  // Update column class based on window resize
  useEffect(() => {
    const updateColumnClass = () => {
      // Get window width
      const width = window.innerWidth;
      if (width < 640) setColumnClass('grid-cols-1'); // Mobile
      else if (width < 768) setColumnClass('grid-cols-1'); // Small tablets
      else if (width < 1024) setColumnClass('grid-cols-2'); // Large tablets/small desktop
      else if (width < 1536) setColumnClass('grid-cols-2'); // Desktop
      else setColumnClass('grid-cols-2'); // Large screens - 2 per row (changed from 3)
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
      <div className={`grid ${columnClass} gap-6 auto-rows-fr grid-flow-dense max-w-[2400px] mx-auto`}>
        {filteredVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onPreview={onPreview}
            onWishlist={onWishlist}
          />
        ))}

        {/* Remove placeholder logic to allow natural grid flow */}
      </div>
    </section>
  );
}