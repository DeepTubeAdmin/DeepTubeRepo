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
    <section className="mb-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
