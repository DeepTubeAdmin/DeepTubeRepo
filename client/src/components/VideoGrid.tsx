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
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        {showViewAll && (
          <Link href={viewAllUrl} className="text-primary hover:underline">
            See All
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
