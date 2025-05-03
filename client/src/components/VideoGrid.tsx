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
  // Calculate items to show (3 rows * columns)
  const [columnCount, setColumnCount] = useState(2); // Default to 2 columns
  const [columnClass, setColumnClass] = useState('grid-cols-2');
  
  // Get optimal number of videos to show (3 rows)
  const itemsToShow = Math.min(videos.length, columnCount * 3);
  const filteredVideos = videos.slice(0, itemsToShow);

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