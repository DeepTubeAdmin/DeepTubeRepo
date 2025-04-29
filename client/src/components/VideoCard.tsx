import { Heart } from "lucide-react";
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
    if (onPreview) {
      onPreview(video.id);
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
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
      className="video-card video-item"
      data-id={video.id}
      data-type={video.contentType}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePreview}
    >
      <div className="thumbnail-container">
        <div className="bg-gray-800 thumbnail flex items-center justify-center">
          <img 
            src={video.thumbnail || "https://via.placeholder.com/640x360?text=No+Thumbnail"} 
            alt={video.title} 
            className="thumbnail" 
          />
        </div>
        
        {/* Video preview on hover */}
        {video.contentType !== 'image' && (
          <video muted loop className={`absolute top-0 left-0 w-full h-full object-cover ${isHovering ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
            {video.vimeoId && (
              <source 
                src={`https://player.vimeo.com/progressive_redirect/playback/${video.vimeoId}/rendition/720p/file.mp4?loc=external`} 
                type="video/mp4" 
              />
            )}
            {youtubeId && (
              <source 
                src={`https://www.youtube.com/embed/${youtubeId}`} 
                type="video/mp4" 
              />
            )}
          </video>
        )}
        
        {/* Duration badge */}
        {video.duration > 0 && video.contentType !== 'image' && (
          <div className="duration">{formatDuration(video.duration)}</div>
        )}
      </div>
      
      {/* Video info */}
      <div className="p-3">
        <h3 className="font-medium truncate">{video.title}</h3>
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <span>{"AI Artist"}</span>
          <div>
            <span className="mr-2">
              <i className="fas fa-eye mr-1"></i>
              {formatNumber(Math.floor(Math.random() * 10000) + 1000)}
            </span>
            <span>
              <i className="fas fa-thumbs-up mr-1"></i>
              {Math.floor(Math.random() * 10) + 90}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Link to detail page */}
      <Link to={`/media/${video.id}`} className="absolute inset-0 z-10 opacity-0">
        View details
      </Link>
    </div>
  );
}
