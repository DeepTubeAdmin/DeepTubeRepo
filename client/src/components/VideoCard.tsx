import { Heart, Play, Pause } from "lucide-react";
import { Video } from "@/types";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { formatNumber, extractYoutubeIdFromEmbed } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function VideoCard({ video, onPreview, onWishlist }: VideoCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isPreviewShown, setIsPreviewShown] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLDivElement>(null);
  
  // Extract YouTube ID from embed code when the component loads
  useEffect(() => {
    if (video.contentType === 'embed' && video.embedCode) {
      const ytId = extractYoutubeIdFromEmbed(video.embedCode);
      if (ytId) {
        setYoutubeId(ytId);
      }
    }
  }, [video.embedCode, video.contentType]);
  
  // Super simple mouseenter/mouseleave handler with pure DOM
  // Function to manually play the preview
  const playPreview = () => {
    console.log(`Manually playing preview for ${video.id}`);
    setIsPreviewShown(true);
    
    try {
      // For MP4 videos
      if (video.contentType === 'video' && videoRef.current) {
        // Add special debugging
        console.log('Playing MP4 video:', video.videoUrl);
        console.log('Video element state:', {
          isPaused: videoRef.current.paused,
          currentSrc: videoRef.current.currentSrc,
          readyState: videoRef.current.readyState,
          networkState: videoRef.current.networkState,
          error: videoRef.current.error
        });
        
        // Reset video completely first
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        
        // Make visible and enable
        videoRef.current.style.opacity = '1';
        videoRef.current.style.pointerEvents = 'auto';
        
        // Set all attributes directly
        videoRef.current.muted = true;
        videoRef.current.loop = true;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;
        
        // Force play with a slight delay
        setTimeout(() => {
          if (videoRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise) {
              playPromise.catch(e => {
                console.error('Error playing video:', e);
                alert('Browser blocked autoplay. Please check your browser settings.');
              });
            }
          }
        }, 100);
      }
      
      // For embedded videos (YouTube/Vimeo)
      if (video.contentType === 'embed' && iframeRef.current) {
        const container = iframeRef.current;
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        
        if (youtubeId) {
          // YouTube embed
          container.innerHTML = '';
          const iframe = document.createElement('iframe');
          iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0`;
          iframe.width = '100%';
          iframe.height = '100%';
          iframe.frameBorder = '0';
          iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
          iframe.allowFullscreen = true;
          container.appendChild(iframe);
        } else if (video.vimeoId) {
          // Vimeo embed
          container.innerHTML = '';
          const iframe = document.createElement('iframe');
          iframe.src = `https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&muted=1`;
          iframe.width = '100%';
          iframe.height = '100%';
          iframe.frameBorder = '0';
          iframe.allow = 'autoplay; fullscreen; picture-in-picture';
          iframe.allowFullscreen = true;
          container.appendChild(iframe);
        }
      }
      
      // Hide play overlay
      if (cardRef.current) {
        const playOverlay = cardRef.current.querySelector('.play-overlay');
        if (playOverlay) {
          (playOverlay as HTMLElement).style.opacity = '0';
        }
      }
    } catch (err) {
      console.error('Error playing preview:', err);
    }
  };
  
  // Auto-preview on mouse enter (keeping same approach in case it works)
  const handleMouseEnter = () => {
    console.log(`Mouse entered card ${video.id}`);
    playPreview();
  };
  
  // Stop preview and cleanup on mouse leave
  const handleMouseLeave = () => {
    console.log(`Mouse left card ${video.id}`);
    setIsPreviewShown(false);
    
    try {
      // For MP4 videos
      if (video.contentType === 'video' && videoRef.current) {
        videoRef.current.style.opacity = '0';
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      // For embedded videos
      if (video.contentType === 'embed' && iframeRef.current) {
        iframeRef.current.style.opacity = '0';
        iframeRef.current.innerHTML = ''; // Remove iframe
      }
      
      // Show play overlay again
      if (cardRef.current) {
        const playOverlay = cardRef.current.querySelector('.play-overlay');
        if (playOverlay) {
          (playOverlay as HTMLElement).style.opacity = '1';
        }
      }
    } catch (err) {
      console.error('Error stopping preview:', err);
    }
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
        {/* Thumbnail Image */}
        <img 
          src={video.thumbnail || "https://via.placeholder.com/640x360?text=No+Thumbnail"} 
          alt={video.title} 
          className="thumbnail w-full h-full object-cover" 
        />
        
        {/* Video Preview (for MP4 videos) */}
        {video.contentType === 'video' && video.videoUrl && (
          <video 
            ref={videoRef}
            muted 
            loop 
            playsInline
            autoPlay={isPreviewShown}
            controls={isPreviewShown}
            style={{ 
              opacity: isPreviewShown ? 1 : 0, 
              transition: 'opacity 0.3s', 
              zIndex: 20, 
              pointerEvents: isPreviewShown ? 'auto' : 'none' 
            }}
            className="absolute top-0 left-0 w-full h-full object-cover"
            src={video.videoUrl}
            poster={video.thumbnail || undefined}
            preload="auto"
          />
        )}
        
        {/* Iframe Container (for YouTube/Vimeo) */}
        {video.contentType === 'embed' && (
          <div 
            ref={iframeRef}
            style={{ 
              opacity: isPreviewShown ? 1 : 0, 
              transition: 'opacity 0.3s', 
              zIndex: 20, 
              pointerEvents: isPreviewShown ? 'auto' : 'none' 
            }}
            className="absolute top-0 left-0 w-full h-full bg-black"
          ></div>
        )}
        
        {/* Manual Preview Button (for when hover doesn't work) */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (isPreviewShown) {
              // Stop preview
              handleMouseLeave();
            } else {
              // Start preview
              playPreview();
            }
          }}
          className={`absolute top-2 left-2 z-30 ${isPreviewShown ? 'bg-orange-600' : 'bg-orange-500'} hover:bg-orange-600 text-white p-2 rounded-full flex items-center justify-center shadow-lg`}
          title={isPreviewShown ? "Stop preview" : "Play preview"}
          style={{ width: '40px', height: '40px' }}
        >
          {isPreviewShown ? (
            <Pause size={24} strokeWidth={3} />
          ) : (
            <Play size={24} strokeWidth={3} />
          )}
        </button>
        
        {/* Play overlay */}
        <div className="play-overlay absolute inset-0 flex items-center justify-center z-10"
             style={{ transition: 'opacity 0.3s' }}>
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
