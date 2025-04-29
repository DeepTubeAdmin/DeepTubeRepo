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
      className="group transition-transform duration-200 overflow-hidden cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePreview}
    >
      <div className="relative">
        {/* Thumbnail with hover effect */}
        <AspectRatio ratio={16/9} className="bg-black">
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
            </div>
          ) : (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="object-cover w-full h-full transition-all duration-300 transform group-hover:scale-110"
            />
          )}
        </AspectRatio>
        
        {/* Duration badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black text-white text-xs font-semibold px-1 py-0.5 rounded-sm">
            {formatDuration(video.duration)}
          </div>
        )}
        
        {/* Play overlay - only shows on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      
      {/* Video info */}
      <div className="pt-2 pb-3 px-1">
        <div className="flex justify-between items-start">
          <h3 
            className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors cursor-pointer mr-2"
          >
            {video.title}
          </h3>
          <Link to={`/media/${video.id}`} className="text-gray-400 hover:text-primary transition-colors">
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>{formatNumber(Math.floor(Math.random() * 10000) + 1000)} views</span>
            <span>•</span>
            <span>{Math.floor(Math.random() * 30) + 1}d ago</span>
          </div>
          
          <button 
            onClick={handleWishlist}
            className="text-gray-400 hover:text-primary transition-colors"
          >
            <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}
