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
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-primary">{title}</h2>
        {showViewAll && (
          <Link href={viewAllUrl} className="text-primary hover:text-primary-dark transition-colors hover:underline">
            See All
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {videos.filter(video => video.contentType !== "image").map((video) => (
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
