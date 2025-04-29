import { Heart, ExternalLink, Clock } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Video } from "@/types";
import { useState, useEffect } from "react";
import VimeoEmbed from "./VimeoEmbed";
import { Link } from "wouter";
import { formatNumber, extractYoutubeIdFromEmbed, isRedditEmbed, extractRedditInfo } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function VideoCard({ video, onPreview, onWishlist }: VideoCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [redditInfo, setRedditInfo] = useState<{subreddit: string | null, postId: string | null, user: string | null} | null>(null);
  
  // Extract embed info from code if applicable
  useEffect(() => {
    if (video.contentType === 'embed' && video.embedCode) {
      // Check if it's a YouTube embed
      const youtubeId = extractYoutubeIdFromEmbed(video.embedCode);
      if (youtubeId) {
        setYoutubeId(youtubeId);
        console.log(`Extracted YouTube ID: ${youtubeId} for video ${video.id}`);
        return;
      }
      
      // Check if it's a Reddit embed
      if (isRedditEmbed(video.embedCode)) {
        const info = extractRedditInfo(video.embedCode);
        setRedditInfo(info);
        console.log(`Extracted Reddit info: Subreddit=${info.subreddit}, Post=${info.postId} for video ${video.id}`);
        
        // If subreddit was not extracted but we know it's a Reddit embed,
        // attempt to extract from URL pattern in the embed code
        if (!info.subreddit && video.embedCode.includes('reddit.com/r/')) {
          const urlPattern = /reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)/;
          const match = video.embedCode.match(urlPattern);
          if (match) {
            setRedditInfo({
              subreddit: match[1],
              postId: match[2],
              user: null
            });
            console.log(`Extracted Reddit info from URL: Subreddit=${match[1]}, Post=${match[2]} for video ${video.id}`);
          }
        }
      }
    }
  }, [video.id, video.embedCode, video.contentType, video.thumbnail]);
  
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
      className="video-card overflow-hidden rounded-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePreview}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Thumbnail section - YouTube style with rounded corners */}
        <div className="relative group rounded-lg overflow-hidden">
          <AspectRatio ratio={16/9} className="w-full sm:w-[180px] md:w-[240px] lg:w-[360px]">
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
                  {/* Show overlay on hover without play button */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity"></div>
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
            
            {video.duration > 0 && (
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded text-[10px] font-semibold">
                {formatDuration(video.duration)}
              </div>
            )}
          </AspectRatio>
        </div>
        
        {/* Content section - YouTube style */}
        <div className="px-2 sm:px-0 py-2 flex-1">
          <div className="flex gap-3">
            {/* Title and details */}
            <div className="flex-1">
              <h3 
                className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                onClick={handlePreview}
              >
                {video.title}
              </h3>
              <div className="flex flex-col sm:flex-row gap-1 sm:items-center mt-1">
                <span className="text-xs text-muted-foreground">{formatNumber(Math.floor(Math.random() * 10000) + 1000)} views</span>
                <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground flex items-center">
                  <span className="sr-only">Posted</span>
                  {Math.floor(Math.random() * 30) + 1}d ago
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link to={`/media/${video.id}`} className="text-muted-foreground hover:text-primary transition-colors">
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button 
                onClick={handleWishlist}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
