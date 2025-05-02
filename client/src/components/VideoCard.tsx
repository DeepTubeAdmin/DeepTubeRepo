import { Heart, Play, ThumbsUp } from "lucide-react";
import { Video } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { formatNumber, extractYoutubeIdFromEmbed } from "@/lib/utils";
import { checkThumbnail } from "@/lib/checkThumbnail";
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
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [username, setUsername] = useState<string>("");
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  // Format duration helper
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle like action
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikeLoading) return;

    setIsLikeLoading(true);
    try {
      const response = await apiRequest(
        isLiked ? 'DELETE' : 'POST',
        `/api/videos/${video.id}/like`
      );
      const data = await response.json();
      setIsLiked(!isLiked);
      setLikeCount(data.count || 0);
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: isLiked ? 'Error removing like' : 'Error adding like',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsLikeLoading(false);
    }
  };

  // Handle preview click
  const handlePreview = () => {
    if (onPreview) onPreview(video.id);
  };

  useEffect(() => {
    const fetchUsername = async () => {
      if (video.userId) {
        try {
          const response = await apiRequest('GET', `/api/users/${video.userId}/profile`);
          const data = await response.json();
          if (data && data.username) {
            setUsername(data.username);
          }
        } catch (error) {
          console.error('Error fetching username:', error);
        }
      }
    };
    fetchUsername();
  }, [video.userId]);

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

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    // setIsWishlisted(!isWishlisted); // Removed as it's not used in the new implementation.
    if (onWishlist) {
      onWishlist(video.id);
    }
  };

  return (
    <div
      ref={cardRef}
      className="video-card relative rounded overflow-hidden bg-[#0f172a] hover:ring-2 hover:ring-orange-500/50 transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handlePreview}
    >
      <div className="aspect-video relative overflow-hidden">
        {/* Base Thumbnail Layer */}
        <ThumbnailImage
          videoId={video.id}
          thumbnail={video.thumbnail}
          title={video.title}
          contentType={video.contentType}
        />

        {/* Video Preview Layer */}
        {video.contentType === 'video' && video.videoUrl && (
          <div className="absolute inset-0">
            <VideoPreview
              src={video.videoUrl}
              poster={checkThumbnail(video.thumbnail || '', video.id)}
              isHovered={isHovered}
              className="w-full h-full object-cover"
              previewDuration={5}
            />
          </div>
        )}

        {/* YouTube Preview Layer */}
        {video.contentType === 'embed' && video.embedCode && isHovered && (
          <div className="absolute inset-0 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${extractYoutubeIdFromEmbed(video.embedCode)}?autoplay=1&mute=1&controls=0&modestbranding=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
            />
          </div>
        )}

        {/* Hover Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-40'
          }`}
        />

        {/* Duration Badge */}
        {video.contentType !== 'image' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded z-10">
            {formatDuration(video.duration ?? 0)}
          </div>
        )}
      </div>

      {/* Video Info Section */}
      <div className="p-3">
        <h3 className="font-medium text-base md:text-lg truncate text-white">
          {video.title}
        </h3>

        <div className="flex justify-between items-center mt-2 text-sm">
          <div className="text-gray-400">
            {video.aiGenerator || "AI Artist"} {username && <>• <Link to={`/user/${username}`} onClick={(e) => e.stopPropagation()} className="text-orange-500 hover:text-orange-400 hover:underline">{username}</Link></>}
          </div>

          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
              isLiked
                ? 'text-orange-500 bg-orange-950/40'
                : 'text-gray-400 hover:text-orange-400'
            }`}
            disabled={isLikeLoading}
          >
            <ThumbsUp className={`h-4 w-4 ${isLikeLoading ? 'animate-pulse' : ''}`} />
            <span className="text-xs">{formatNumber(likeCount)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}