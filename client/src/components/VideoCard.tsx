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
      <div className="thumbnail-container relative overflow-hidden aspect-video h-52 sm:h-56 md:h-60 lg:h-64">
        {/* Always show thumbnail as base layer for all content types */}
        <img 
          src={
            // If we have a thumbnail, use it
            video.thumbnail ? video.thumbnail :
            // For video type with videoUrl but no thumbnail, use a base64 encoded placeholder
            (video.contentType === 'video' && video.videoUrl) ? 
              `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAADkCAYAAACQtPrFAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFyUlEQVR4nO3csWsbdxzG8afW0JZASc2gIZRCB0MhHQqZsnnI5qFTh2bqlD+hFDJ1zB8QunUoGQqZMmQJBEpJIWQopEOgUEhKg6GN0eCKkXXStXeypLvT3ef9gLHPllB+fH/3vt+d7vb29r4GABztm9EHAICTSSAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABIBAIAiUAAIBEIACQCAYBEIACQCAQAEoEAQCIQAEgEAgCJQAAgEQgAJAIBgEQgAJAIBAASgQBAIhAASAQCAIlAACARCAAkAgGARCAAkAgEABKBAEAiEABI/gOnA0UVdYKHSAAAAABJRU5ErkJggg==` : 
              // Fallback placeholder
              "https://placehold.co/400x225?text=AI+Video"
          } 
          alt={video.title} 
          className="w-full h-full object-cover absolute inset-0" 
        />
            
        {/* Video previews only for video type with valid videoUrl on hover */}
        {video.contentType === 'video' && isHovered && video.videoUrl && (
          <div className="absolute inset-0 w-full h-full">
            <video 
              src={video.videoUrl}
              autoPlay
              muted
              playsInline
              loop={true}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error(`Error loading video: ${video.videoUrl}`, e);
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
        
        {/* No video URL available but still show "Watch Full Video" button on hover */}
        {video.contentType === 'video' && isHovered && !video.videoUrl && (
          <div className="absolute inset-0 w-full h-full bg-black/60 flex flex-col items-center justify-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handlePreview();
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
            >
              Watch Full Video
            </button>
          </div>
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
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=1&start=0&disablekb=1&rel=0&loop=1&playlist=${youtubeId}`}
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
        
        {/* Duration badge */}
        {video.duration > 0 && video.contentType !== 'image' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 py-0.5 rounded z-30">
            {formatDuration(video.duration)}
          </div>
        )}
        

      </div>
      
      {/* Video info */}
      <div className="p-3 bg-transparent">
        <h3 className="font-medium text-base md:text-lg truncate">{video.title}</h3>
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
