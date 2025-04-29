import { Heart } from "lucide-react";
import { Video } from "@/types";
import { useState, useEffect, useRef } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Handle MP4 video hover preview
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isHovering && video.contentType === 'video') {
      console.log(`Playing preview for video ${video.id}`);
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error(`Error playing preview for video ${video.id}:`, error);
        });
      }
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovering, video.id, video.contentType]);
  
  // Handle YouTube/iframe preview
  useEffect(() => {
    if (!iframeContainerRef.current) return;
    
    if (isHovering && video.contentType === 'embed') {
      const container = iframeContainerRef.current;
      if (youtubeId) {
        console.log(`Creating YouTube preview iframe for ${youtubeId}`);
        // Create iframe for YouTube preview
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0`;
        iframe.className = 'w-full h-full';
        iframe.frameBorder = '0';
        iframe.allow = 'autoplay; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.title = video.title;
        
        // Clear container and append iframe
        container.innerHTML = '';
        container.appendChild(iframe);
      } else if (video.vimeoId) {
        console.log(`Creating Vimeo preview iframe for ${video.vimeoId}`);
        // Create iframe for Vimeo preview
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&loop=1&title=0&byline=0&portrait=0&muted=1`;
        iframe.className = 'w-full h-full';
        iframe.frameBorder = '0';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.title = video.title;
        
        // Clear container and append iframe
        container.innerHTML = '';
        container.appendChild(iframe);
      }
    } else if (iframeContainerRef.current && !isHovering) {
      // Clear iframe container when not hovering
      iframeContainerRef.current.innerHTML = '';
    }
  }, [isHovering, youtubeId, video.vimeoId, video.contentType, video.title]);
  
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
    console.log(`Mouse enter for video ${video.id}, type: ${video.contentType}`);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    console.log(`Mouse leave for video ${video.id}`);
    setIsHovering(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="video-card video-item relative"
      data-id={video.id}
      data-type={video.contentType}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePreview}
    >
      <div className="thumbnail-container relative overflow-hidden aspect-video">
        <div className="bg-gray-800 thumbnail flex items-center justify-center relative h-full">
          <img 
            src={video.thumbnail || "https://via.placeholder.com/640x360?text=No+Thumbnail"} 
            alt={video.title} 
            className="thumbnail w-full h-full object-cover" 
          />
        </div>
        
        {/* Video preview on hover for MP4 videos */}
        {video.contentType === 'video' && video.videoUrl && (
          <video 
            ref={videoRef}
            muted 
            loop 
            className={`absolute top-0 left-0 w-full h-full object-cover ${isHovering ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            src={video.videoUrl}
            poster={video.thumbnail || undefined}
            preload="metadata"
            playsInline
          />
        )}
        
        {/* YouTube/Vimeo preview container */}
        {video.contentType === 'embed' && (
          <div 
            ref={iframeContainerRef}
            className={`iframe-container absolute top-0 left-0 w-full h-full ${isHovering ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 bg-black z-10`}
          ></div>
        )}
        
        {/* Play overlay for videos and embeds */}
        {(video.contentType === 'video' || video.contentType === 'embed') && (
          <div className={`play-overlay absolute inset-0 flex items-center justify-center ${isHovering ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
            <div className="bg-black bg-opacity-50 rounded-full p-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          </div>
        )}
        
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
