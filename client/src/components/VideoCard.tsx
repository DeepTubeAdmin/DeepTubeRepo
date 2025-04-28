import { Heart, Play, ExternalLink, Clock } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Video } from "@/types";
import { useState } from "react";
import VimeoEmbed from "./VimeoEmbed";
import { Link } from "wouter";
import { formatNumber } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function VideoCard({ video, onPreview, onWishlist }: VideoCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
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

  const handleMouseEnter = () => {
    setIsHovering(true);
    // We don't want to call onPreview here anymore as it triggers the popup
    // Instead, the video preview is handled directly in this component
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      id={`video-preview-${video.id}`}
      className="video-card bg-card overflow-hidden rounded-md shadow-sm hover:shadow-md transition-all"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative group">
        <AspectRatio ratio={16/9}>
          {isHovering && video.vimeoId ? (
            <VimeoEmbed 
              videoId={video.vimeoId} 
              autoplay={true}
              loop={true}
              showTitle={false}
              showByline={false}
              showPortrait={false}
            />
          ) : (
            <img
              src={video.thumbnail}
              alt={video.title}
              className={`object-cover w-full h-full transition-opacity duration-300 ${isHovering ? 'opacity-70' : 'opacity-100'}`}
            />
          )}
        </AspectRatio>
        
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(video.duration)}
        </div>
        
        {isHovering && !video.vimeoId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse">
              <Play className="h-12 w-12 text-white opacity-70" />
            </div>
          </div>
        )}
      </div>
      
      <div className="p-2">
        <div className="flex justify-between items-center">
          <h3 
            className="text-sm font-medium line-clamp-1 hover:text-primary transition-colors cursor-pointer"
            onClick={handlePreview}
          >
            {video.title}
          </h3>
          <Link to={`/media/${video.id}`} className="text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <div className="flex items-center text-xs text-muted-foreground">
            <span className="mr-3">{formatNumber(Math.floor(Math.random() * 10000) + 1000)} views</span>
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {Math.floor(Math.random() * 30) + 1}d ago
            </span>
          </div>
          
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
