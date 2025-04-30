import { Heart, Play } from "lucide-react";
import { Video } from "@/types";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { formatNumber, extractYoutubeIdFromEmbed } from "@/lib/utils";
import VideoPreview from "./VideoPreview";

interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function VideoCard({ video, onPreview, onWishlist }: VideoCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Extract YouTube ID from embed code when the component loads
  useEffect(() => {
    if (video.contentType === 'embed' && video.embedCode) {
      const ytId = extractYoutubeIdFromEmbed(video.embedCode);
      if (ytId) {
        setYoutubeId(ytId);
      }
    }
  }, [video.embedCode, video.contentType]);
  
  // Mouse enter handler - set state only
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  // Mouse leave handler - set state only
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

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
    <div 
      ref={cardRef}
      className="video-card video-item relative rounded overflow-hidden"
      data-id={video.id}
      data-type={video.contentType}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePreview}
    >
      <div className="thumbnail-container relative overflow-hidden aspect-video">
        {/* Video with 5-second preview on hover for video type */}
        {video.contentType === 'video' && video.videoUrl ? (
          <VideoPreview
            src={video.videoUrl}
            poster={video.thumbnail || "https://via.placeholder.com/640x360?text=No+Thumbnail"}
            isHovered={isHovered}
            className="w-full h-full object-cover"
            previewDuration={5}
          />
        ) : (
          /* Static thumbnail for non-video content types */
          <img 
            src={video.thumbnail || "https://via.placeholder.com/640x360?text=No+Thumbnail"} 
            alt={video.title} 
            className="thumbnail w-full h-full object-cover" 
          />
        )}
        
        {/* YouTube Preview for embed type only */}
        {video.contentType === 'embed' && youtubeId && isHovered && (
          <div 
            className="absolute inset-0 z-15 bg-black"
            onClick={(e) => {
              // Prevent clicks on the iframe from propagating
              e.stopPropagation();
              handlePreview();
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=1&start=0&end=5&disablekb=1&rel=0&loop=0&playlist=${youtubeId}`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={video.title}
              onLoad={() => console.log(`YouTube embed loaded for video ID: ${youtubeId}`)}
            />
          </div>
        )}
        
        {/* Hover overlay with gradient for better button visibility */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-20"
          style={{
            opacity: isHovered ? 1 : 0.2,
            transition: 'opacity 0.2s ease-in-out',
          }}
        ></div>
        
        {/* Prominent Play Button in center */}
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handlePreview();
            }}
            className={`${isHovered ? 'scale-125 bg-opacity-90' : 'scale-100 bg-opacity-70'} 
                       bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full 
                       flex items-center justify-center shadow-lg transition-all duration-200`}
            title="Watch video"
            aria-label="Play video"
          >
            <Play size={36} strokeWidth={3} />
          </button>
        </div>
        
        {/* Duration badge */}
        {video.duration > 0 && video.contentType !== 'image' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 py-0.5 rounded z-30">
            {formatDuration(video.duration)}
          </div>
        )}
        
        {/* Content type badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full z-30 uppercase">
          {video.contentType === 'video' ? 'MP4' : 
           video.contentType === 'image' ? 'IMG' : 
           video.contentType === 'embed' ? 'YT' : 'Media'}
        </div>
      </div>
      
      {/* Video info */}
      <div className="p-3 bg-gray-900">
        <h3 className="font-medium truncate">{video.title}</h3>
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <span>{video.aiGenerator || "AI Artist"}</span>
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
    </div>
  );
}
