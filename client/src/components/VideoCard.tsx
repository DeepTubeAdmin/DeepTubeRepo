import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Play } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { Video } from "@/types";
import { useState } from "react";

interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function VideoCard({ video, onPreview, onWishlist }: VideoCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    if (onWishlist) {
      onWishlist(video.id);
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(video.id);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-card bg-card overflow-hidden rounded-md shadow-sm hover:shadow-md transition-all">
      <div className="relative group">
        <AspectRatio ratio={16/9}>
          <img
            src={video.thumbnail}
            alt={video.title}
            className="object-cover w-full h-full"
          />
        </AspectRatio>
        
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(video.duration)}
        </div>
        
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {video.resolution}
        </div>
        
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button 
            className="bg-primary hover:bg-primary/90 text-white font-medium px-3 py-1.5 rounded-md text-sm"
            onClick={handlePreview}
          >
            <Play className="h-3 w-3 inline mr-1" /> Preview
          </button>
        </div>
      </div>
      
      <div className="p-2">
        <h3 
          className="text-sm font-medium line-clamp-1 hover:text-primary transition-colors cursor-pointer"
          onClick={handlePreview}
        >
          {video.title}
        </h3>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-xs text-muted-foreground">
            AI Generated
          </span>
          
          <button 
            onClick={handleWishlist}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}
