import { Heart, Play } from "lucide-react";
import { Video } from "@/types";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { formatNumber, extractYoutubeIdFromEmbed } from "@/lib/utils";
import PreviewableVideo from "./PreviewableVideo";

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
  
  // Mouse enter handler - just set hovered state
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  // Mouse leave handler - reset hovered state
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
        {/* Thumbnail Image - only shown when not hovering on video */}
        <img 
          src={video.thumbnail || "https://via.placeholder.com/640x360?text=No+Thumbnail"} 
          alt={video.title} 
          className="thumbnail w-full h-full object-cover" 
          style={{ 
            opacity: isHovered && video.contentType === 'video' && video.videoUrl ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {/* Video Preview - shown when hovering, using our specialized component */}
        {video.contentType === 'video' && video.videoUrl && (
          <div className="absolute inset-0 z-10">
            <PreviewableVideo
              src={video.videoUrl}
              poster={video.thumbnail || undefined}
              isPlaying={isHovered}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* YouTube Preview for embed type */}
        {video.contentType === 'embed' && youtubeId && isHovered && (
          <div className="absolute inset-0 z-10 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={video.title}
            />
          </div>
        )}
        
        {/* Animated hover effect - place above video but lower z-index than controls */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-20"
          style={{
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: 'none' // Allow clicks through to the video beneath
          }}
        ></div>
        
        {/* Play Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handlePreview();
          }}
          className={`absolute top-2 left-2 z-30 ${isHovered ? 'opacity-100' : 'opacity-70'} bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-full flex items-center justify-center shadow-lg transition-opacity`}
          title="Watch video"
          style={{ width: '40px', height: '40px' }}
        >
          <Play size={24} strokeWidth={3} />
        </button>
        
        {/* Play icon overlay - appears on hover */}
        <div 
          className="absolute inset-0 flex items-center justify-center z-25"
          style={{ 
            opacity: isHovered ? 1 : 0.5,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: 'none' // Make sure it doesn't block clicks
          }}
        >
          <div className="bg-black bg-opacity-50 rounded-full p-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
        </div>
        
        {/* Duration badge */}
        {video.duration > 0 && video.contentType !== 'image' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 py-0.5 rounded z-30">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>
      
      {/* Video info */}
      <div className="p-3 bg-gray-900">
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
      <Link to={`/media/${video.id}`} className="absolute inset-0 z-5 opacity-0">
        View details
      </Link>
    </div>
  );
}
