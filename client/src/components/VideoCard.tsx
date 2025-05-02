import { Heart, Play, ThumbsUp } from "lucide-react";
import { Video } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { formatNumber, extractYoutubeIdFromEmbed, fetchS3Url } from "@/lib/utils";
import { checkThumbnail } from "@/lib/checkThumbnail";
import S3VideoPlayer from "./S3VideoPlayer";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VideoPreview from "./VideoPreview";

interface ThumbnailImageProps {
  videoId: number;
  thumbnail: string | null;
  title: string;
  contentType: string;
}

// Component to handle thumbnail loading with proper S3 URL resolution
function ThumbnailImage({ videoId, thumbnail, title, contentType }: ThumbnailImageProps) {
  // Extract YouTube ID for embeds
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  
  // Get YouTube ID for embed content types
  useEffect(() => {
    if (contentType === 'embed' && thumbnail && 
        (thumbnail.includes('youtube.com') || thumbnail.includes('youtu.be'))) {
      // Try to parse YouTube ID from the thumbnail URL
      const ytMatch = thumbnail.match(/(?:youtube\.com\/vi\/|img\.youtube\.com\/vi\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch && ytMatch[1]) {
        setYoutubeId(ytMatch[1]);
      }
    }
  }, [contentType, thumbnail]);
  
  // Default to our API endpoint with a cache buster
  let reliableThumbnail = thumbnail ? checkThumbnail(thumbnail, videoId) : `/api/videos/${videoId}/thumbnail?t=${Date.now()}`;
  
  // Override for YouTube embeds - use direct YouTube image URL
  if (contentType === 'embed' && youtubeId) {
    reliableThumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }
  
  // Set the state to our validated thumbnail URL
  const [imgSrc, setImgSrc] = useState<string>(reliableThumbnail);
  const [isLoading, setIsLoading] = useState(false);
  
  // Update imgSrc when reliableThumbnail changes
  useEffect(() => {
    setImgSrc(reliableThumbnail);
  }, [reliableThumbnail]);
  
  // Simple loading state for visibility
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  // Always show the image with the current imgSrc state
  return (
    <>
      {isLoading && (
        <div className="w-full h-full absolute inset-0 bg-black/20 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-t-orange-500 border-orange-500/30 rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={imgSrc} 
        alt={title} 
        className="w-full h-full object-cover absolute inset-0" 
        onError={(e) => {
          // If the image fails to load, try different YouTube thumbnail sizes if it's YouTube
          if (contentType === 'embed' && youtubeId) {
            // Try medium quality if high quality fails
            if (imgSrc.includes('hqdefault')) {
              console.log(`ThumbnailImage: Falling back to medium quality YouTube thumbnail for video ${videoId}`);
              setImgSrc(`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`);
              return;
            } else if (imgSrc.includes('mqdefault')) {
              // Try default quality if medium quality fails
              console.log(`ThumbnailImage: Falling back to default quality YouTube thumbnail for video ${videoId}`);
              setImgSrc(`https://img.youtube.com/vi/${youtubeId}/default.jpg`);
              return;
            }
          }
          
          // If all else fails, use our API endpoint with SVG flag
          console.error(`ThumbnailImage: Error loading thumbnail for video ${videoId}`);
          e.currentTarget.src = `/api/videos/${videoId}/thumbnail?forcesvg=true&t=${Date.now()}`;
        }}
      />
    </>
  );
}


interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function VideoCard({ video, onPreview, onWishlist }: VideoCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const { toast } = useToast();
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
  
  // State for username
  const [username, setUsername] = useState<string>("");
  
  // Fetch like status and count when component mounts
  useEffect(() => {
    const fetchLikeStatus = async () => {
      try {
        const response = await apiRequest('GET', `/api/videos/${video.id}/like`);
        const data = await response.json();
        
        setIsLiked(data.isLiked);
        setLikeCount(data.count || 0);
      } catch (error) {
        console.error('Error fetching like status:', error);
      }
    };
    
    fetchLikeStatus();
  }, [video.id]);
  
  // Fetch username if video has a userId
  useEffect(() => {
    if (video.userId) {
      const fetchUsername = async () => {
        try {
          const response = await apiRequest('GET', `/api/users/${video.userId}/profile`);
          const data = await response.json();
          if (data && data.username) {
            setUsername(data.username);
          }
        } catch (error) {
          console.error('Error fetching username:', error);
        }
      };
      
      fetchUsername();
    }
  }, [video.userId]);
  
  // Handle liking/unliking a video
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isLikeLoading) return;
    
    setIsLikeLoading(true);
    
    try {
      // If already liked, unlike it
      if (isLiked) {
        const response = await apiRequest('DELETE', `/api/videos/${video.id}/like`);
        const data = await response.json();
        
        setIsLiked(false);
        setLikeCount(data.count || 0);
      } else {
        // Otherwise like it
        const response = await apiRequest('POST', `/api/videos/${video.id}/like`);
        const data = await response.json();
        
        setIsLiked(true);
        setLikeCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error toggling like status:', error);
      toast({
        title: isLiked ? 'Error removing like' : 'Error adding like',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsLikeLoading(false);
    }
  };
  
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
    console.log('VideoCard: handlePreview called for video', video.id);
    if (onPreview) {
      console.log('VideoCard: Calling onPreview with video ID', video.id);
      onPreview(video.id);
    } else {
      console.log('VideoCard: onPreview prop is not provided');
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00';
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
        <ThumbnailImage 
          videoId={video.id}
          thumbnail={video.thumbnail} 
          title={video.title}
          contentType={video.contentType}
        />
            
        {/* Image preview handling */}
        {(video.contentType === 'image' || video.contentType === 'images') && video.imageUrl && (
          <div className="absolute inset-0 w-full h-full">
            <img 
              src={video.imageUrl}
              alt={video.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              onError={(e) => {
                e.currentTarget.src = video.thumbnail || `/api/videos/${video.id}/thumbnail`;
              }}
            />
          </div>
        )}

        {/* Video previews only for video type with valid videoUrl on hover */}
        {video.contentType === 'video' && video.videoUrl && (
          <div className="absolute inset-0 w-full h-full">
            {isHovered ? (
              <VideoPreview
                src={video.videoUrl}
                poster={checkThumbnail(video.thumbnail || '', video.id)}
                isHovered={isHovered}
                className="w-full h-full object-cover"
                previewDuration={60} // Play continuously instead of just 5 seconds
              />
            ) : null}
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
        {video.contentType !== 'image' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 py-0.5 rounded z-30">
            {formatDuration(video.duration ?? 0)}
          </div>
        )}
        

      </div>
      
      {/* Video info */}
      <div className="p-3 bg-[#0f172a]">
        <h3 className="font-medium text-base md:text-lg truncate">{video.title}</h3>
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <div className="flex items-center space-x-2">
            <span>{video.aiGenerator || "AI Artist"}</span>
            {username && (
              <>
                <span className="text-gray-500">•</span>
                <Link 
                  to={`/user/${username}`} 
                  onClick={(e) => e.stopPropagation()}
                  className="text-orange-500 hover:text-orange-400 hover:underline"
                >
                  {username}
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center">
            {/* Like button - much more prominent and visually distinct */}
            <button 
              onClick={handleLike}
              className={`flex items-center mr-2 p-1 rounded border ${isLiked 
                ? 'text-orange-500 bg-orange-950/40 border-orange-500' 
                : 'text-gray-400 hover:text-orange-400 hover:bg-gray-800 border border-gray-700 hover:border-orange-500'}`}
              disabled={isLikeLoading}
            >
              <ThumbsUp className={`h-4 w-4 ${isLikeLoading ? 'animate-pulse' : ''}`} />
              <span className="sr-only">Like this video</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
