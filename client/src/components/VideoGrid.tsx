import { Video } from "@/types";
import VideoCard from "./VideoCard";
import { Link } from "wouter";

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
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-1 h-6 bg-primary mr-3"></div>
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        </div>
        {showViewAll && (
          <Link href={viewAllUrl}>
            <span className="text-primary hover:underline cursor-pointer flex items-center">
              See All 
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onPreview={onPreview}
            onWishlist={onWishlist}
          />
        ))}
      </div>
    </section>
  );
}
