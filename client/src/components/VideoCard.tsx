import { Heart, Play, ExternalLink, Clock } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Video } from "@/types";
import { useState, useEffect } from "react";
import VimeoEmbed from "./VimeoEmbed";
import { Link } from "wouter";
import { formatNumber, extractYoutubeIdFromEmbed } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function VideoCard({ video, onPreview, onWishlist }: VideoCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  
  // Extract YouTube ID from embed code if applicable
  useEffect(() => {
    if (video.contentType === 'embed' && video.embedCode) {
      const id = extractYoutubeIdFromEmbed(video.embedCode);
      setYoutubeId(id);
      console.log(`Extracted YouTube ID: ${id} for video ${video.id}`);
    }
  }, [video.id, video.embedCode, video.contentType]);
  
  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    if (onWishlist) {
      onWishlist(video.id);
    }
  };

  const handlePreview = () => {
    console.log("Preview clicked for video ID:", video.id);
    if (onPreview) {
      console.log("Calling onPreview with video ID:", video.id);
      onPreview(video.id);
    } else {
      console.log("onPreview callback is not defined");
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
      className="video-card bg-card overflow-hidden rounded-md shadow-sm hover:shadow-md transition-all cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePreview}
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
          ) : isHovering && video.contentType === 'embed' && youtubeId ? (
            // For YouTube embeds on hover, show the YouTube video preview with an overlay to catch clicks
            <div className="w-full h-full relative">
              <iframe 
                className="absolute inset-0 w-full h-full border-0"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${youtubeId}`}
                title={`${video.title} Preview`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              {/* This transparent overlay prevents clicks from going to the iframe */}
              <div 
                className="absolute inset-0 bg-transparent z-10 cursor-pointer" 
                onClick={handlePreview}
                aria-label="Open full video player"
              >
                {/* Show a play button overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-primary p-3 rounded-full animate-pulse">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          ) : (
            <img
              src={video.thumbnail}
              alt={video.title}
              className={`object-cover w-full h-full transition-opacity duration-300 ${isHovering ? 'opacity-70' : 'opacity-100'}`}
            />
          )}
        </AspectRatio>
        
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </div>
        )}
        
        {isHovering && video.contentType !== 'embed' && !video.vimeoId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse">
              <Play className="h-12 w-12 text-white opacity-70" />
            </div>
          </div>
        )}
        
        {/* YouTube Play Button for YouTube videos when not hovering */}
        {!isHovering && video.contentType === 'embed' && (
          <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
            <div className="bg-primary/90 p-2 rounded-full">
              <Play className="h-8 w-8 text-white" />
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
