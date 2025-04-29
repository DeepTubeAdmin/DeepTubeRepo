import { Heart } from "lucide-react";
import { Video } from "@/types";
import { useState, useEffect } from "react";
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
  
  useEffect(() => {
    if (video.contentType === 'embed' && video.embedCode) {
      const ytId = extractYoutubeIdFromEmbed(video.embedCode);
      if (ytId) {
        setYoutubeId(ytId);
      }
    }
  }, [video.embedCode, video.contentType]);

  useEffect(() => {
    // This is important - we need to directly interact with the DOM for videos to play on hover
    const videoElement = document.querySelector(`#video-preview-${video.id}`) as HTMLVideoElement;
    const cardElement = document.querySelector(`#video-card-${video.id}`);
    
    if (!cardElement) return;
    
    // Using the old-school event listener approach for maximum compatibility
    const handleMouseEnter = () => {
      console.log(`Mouse over video card ${video.id}`);
      if (videoElement && video.contentType === 'video') {
        try {
          videoElement.currentTime = 0;
          videoElement.play().catch(e => console.error("Failed to play video:", e));
        } catch (err) {
          console.error("Error playing video:", err);
        }
      }
      
      // For YouTube/Vimeo embeds
      const container = document.querySelector(`#iframe-container-${video.id}`);
      if (container && video.contentType === 'embed') {
        try {
          // Clear any existing content
          container.innerHTML = '';
          
          if (youtubeId) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0`;
            iframe.width = "100%";
            iframe.height = "100%";
            iframe.frameBorder = "0";
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            container.appendChild(iframe);
          } else if (video.vimeoId) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&muted=1`;
            iframe.width = "100%";
            iframe.height = "100%";
            iframe.frameBorder = "0";
            iframe.allow = "autoplay; fullscreen; picture-in-picture";
            iframe.allowFullscreen = true;
            container.appendChild(iframe);
          }
        } catch (err) {
          console.error("Error creating iframe:", err);
        }
      }
    };
    
    const handleMouseLeave = () => {
      console.log(`Mouse out of video card ${video.id}`);
      if (videoElement && video.contentType === 'video') {
        try {
          videoElement.pause();
          videoElement.currentTime = 0;
        } catch (err) {
          console.error("Error pausing video:", err);
        }
      }
      
      // For YouTube/Vimeo embeds - clear the iframe
      const container = document.querySelector(`#iframe-container-${video.id}`);
      if (container) {
        container.innerHTML = '';
      }
    };
    
    cardElement.addEventListener('mouseenter', handleMouseEnter);
    cardElement.addEventListener('mouseleave', handleMouseLeave);
    
    // Clean up
    return () => {
      cardElement.removeEventListener('mouseenter', handleMouseEnter);
      cardElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [video.id, video.contentType, youtubeId, video.vimeoId]);

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
      id={`video-card-${video.id}`}
      className="video-card video-item relative"
      data-id={video.id}
      data-type={video.contentType}
      onClick={handlePreview}
    >
      <div className="thumbnail-container relative overflow-hidden aspect-video">
        {/* Thumbnail Image */}
        <img 
          src={video.thumbnail || "https://via.placeholder.com/640x360?text=No+Thumbnail"} 
          alt={video.title} 
          className="thumbnail w-full h-full object-cover" 
        />
        
        {/* Video Preview (for MP4 videos) */}
        {video.contentType === 'video' && video.videoUrl && (
          <video 
            id={`video-preview-${video.id}`}
            muted 
            loop 
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover opacity-0 hover:opacity-100 transition-opacity duration-300 z-20"
            src={video.videoUrl}
            poster={video.thumbnail || undefined}
            preload="metadata"
          />
        )}
        
        {/* Iframe Container (for YouTube/Vimeo) */}
        {video.contentType === 'embed' && (
          <div 
            id={`iframe-container-${video.id}`}
            className="iframe-container absolute top-0 left-0 w-full h-full opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black z-20"
          ></div>
        )}
        
        {/* Play overlay */}
        <div className="play-overlay absolute inset-0 flex items-center justify-center opacity-100 hover:opacity-0 transition-opacity duration-300 z-10">
          <div className="bg-black bg-opacity-50 rounded-full p-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
        </div>
        
        {/* Duration badge */}
        {video.duration > 0 && video.contentType !== 'image' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
            {formatDuration(video.duration)}
          </div>
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
