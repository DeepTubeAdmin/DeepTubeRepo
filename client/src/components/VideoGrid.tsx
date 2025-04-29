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
  
  return (
    <section className="mb-6">
      {/* YouTube-style section heading with title and optional view all link */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">{title}</h2>
        {showViewAll && filteredVideos.length > 0 && (
          <Link to={viewAllUrl} className="text-primary text-sm hover:underline">
            View all
          </Link>
        )}
      </div>
      
      {/* YouTube-style list layout */}
      <div className="flex flex-col space-y-4">
        {filteredVideos.map((video) => (
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
