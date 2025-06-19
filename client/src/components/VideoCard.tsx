import { Heart, Play, ThumbsUp, Flag, Volume2, VolumeX } from "lucide-react";
import { Video } from "@/types";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { formatNumber, extractYoutubeIdFromEmbed } from "@/lib/utils";
import { checkThumbnail } from "@/lib/checkThumbnail";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VideoPreview from "./VideoPreview";
import { createSeoFriendlySlug } from "@/lib/seoUrl";
import { useVideoPlayback } from "@/contexts/VideoPlaybackContext";

interface ThumbnailImageProps {
  videoId: number;
  thumbnail: string | null;
  title: string;
  contentType: string;
}

// Component to handle thumbnail loading with proper S3 URL resolution
function ThumbnailImage({
  videoId,
  thumbnail,
  title,
  contentType,
}: ThumbnailImageProps) {
  // Extract YouTube ID for embeds
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  // Track loading and error states
  const [imgSrc, setImgSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadAttemptTime, setLoadAttemptTime] = useState(Date.now());
  const maxRetries = 3;

  // Get YouTube ID for embed content types
  useEffect(() => {
    if (
      contentType === "embed" &&
      thumbnail &&
      (thumbnail.includes("youtube.com") || thumbnail.includes("youtu.be"))
    ) {
      // Try to parse YouTube ID from the thumbnail URL
      const patterns = [
        /(?:youtube\.com\/vi\/|img\.youtube\.com\/vi\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      ];

      for (const pattern of patterns) {
        const match = thumbnail.match(pattern);
        if (match && match[1]) {
          setYoutubeId(match[1]);
          break;
        }
      }
    }
  }, [contentType, thumbnail]);

  // Initialize thumbnail source with a reliable method
  useEffect(() => {
    setIsLoading(true);
    setLoadFailed(false);
    setRetryCount(0);

    // Reset timestamp for cache busting
    setLoadAttemptTime(Date.now());

    // Default to our API endpoint with a cache buster
    let reliableThumbnail = thumbnail
      ? checkThumbnail(thumbnail, videoId)
      : `/api/content/${videoId}/thumbnail?t=${Date.now()}`;

    // Override for YouTube embeds - use direct YouTube image URL
    if (contentType === "embed" && youtubeId) {
      reliableThumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }

    setImgSrc(reliableThumbnail);
  }, [videoId, thumbnail, contentType, youtubeId]);

  // Define an internal retry mechanism
  const retryWithFallback = () => {
    setRetryCount((prev) => prev + 1);
    setLoadAttemptTime(Date.now());

    // If YouTube content, try different quality levels
    if (contentType === "embed" && youtubeId) {
      if (retryCount === 0) {
        // First retry: Try medium quality
        console.log(
          `ThumbnailImage: Trying medium quality for video ${videoId}`
        );
        setImgSrc(`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`);
      } else if (retryCount === 1) {
        // Second retry: Try standard quality
        console.log(
          `ThumbnailImage: Trying standard quality for video ${videoId}`
        );
        setImgSrc(`https://img.youtube.com/vi/${youtubeId}/default.jpg`);
      } else {
        // Final fallback: Force SVG placeholder
        console.error(
          `ThumbnailImage: All YouTube qualities failed for video ${videoId}`
        );
        setImgSrc(
          `/api/content/${videoId}/thumbnail?placeholder=true&t=${loadAttemptTime}`
        );
        setLoadFailed(true);
      }
    } else {
      // Non-YouTube content, go directly to API with forced SVG
      console.error(
        `ThumbnailImage: Error loading thumbnail for video ${videoId}`
      );
      setImgSrc(
        `/api/content/${videoId}/thumbnail?placeholder=true&t=${loadAttemptTime}`
      );
      setLoadFailed(true);
    }
  };

  // Handle image load and error events
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    if (retryCount < maxRetries) {
      retryWithFallback();
    } else {
      setIsLoading(false);
      setLoadFailed(true);
      console.error(`ThumbnailImage: All retries failed for video ${videoId}`);
    }
  };

  // Always show the image with the current imgSrc state
  return (
    <>
      {isLoading && (
        <div className="w-full h-full absolute inset-0 bg-black/70 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-t-orange-500 border-orange-500/30 rounded-full animate-spin"></div>
        </div>
      )}
      {loadFailed && (
        <div className="w-full h-full absolute inset-0 bg-black flex items-center justify-center z-5">
          <div className="w-16 h-16 text-orange-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        </div>
      )}
      {imgSrc && (
        <img
          src={imgSrc}
          alt={title}
          className="w-full h-full object-cover absolute inset-0"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            opacity: loadFailed ? 0.5 : 1,
          }} /* Dim failed thumbnails but keep them visible */
        />
      )}
    </>
  );
}

interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
  size?: "default" | "small" | "medium" | "large";
  compact?: boolean;
}

export default function VideoCard({
  video,
  onPreview,
  onWishlist,
  size = "default",
  compact = false,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [isMuted, setIsMuted] = useState(true);
  const [isInCenter, setIsInCenter] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { toast } = useToast();
  const { setCurrentPlayingVideo, pauseAllVideos, isVideoAllowedToPlay } = useVideoPlayback();

  // Effect to ensure clean state when component mounts
  useEffect(() => {
    // On mount, if this video becomes centered immediately, ensure no other videos are playing
    return () => {
      // On unmount, if this was the playing video, clear it
      if (videoRef.current) {
        setCurrentPlayingVideo(null);
      }
    };
  }, [setCurrentPlayingVideo]);

  // Mobile-specific video initialization
  useEffect(() => {
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;
    
    if (isMobile && videoRef.current) {
      const video = videoRef.current;
      
      // Ensure mobile compatibility attributes are set
      video.muted = true;
      video.setAttribute('muted', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x5-playsinline', 'true');
      video.setAttribute('x5-video-player-type', 'h5');
      video.setAttribute('x5-video-player-fullscreen', 'true');
      
      // Add touch event listener to enable user interaction
      const handleTouch = () => {
        console.log(`VideoCard ${video.id}: Mobile touch interaction detected`);
        // This helps with autoplay policy on mobile browsers
        video.load();
      };
      
      video.addEventListener('touchstart', handleTouch, { passive: true });
      
      return () => {
        video.removeEventListener('touchstart', handleTouch);
      };
    }
  }, [video.id]);

  // Handle orientation change and window resize for mobile devices
  useEffect(() => {
    const handleOrientationChange = () => {
      // Small delay to allow screen dimensions to update
      setTimeout(() => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        console.log(`VideoCard ${video.id}: Orientation/resize change - ${newWidth}x${newHeight}`);
        
        // Force re-evaluation of intersection observer settings
        if (observerRef.current && cardRef.current) {
          observerRef.current.disconnect();
          // The intersection observer effect will re-run due to dependency changes
        }
      }, 100);
    };

    // Listen for both resize and orientation change events
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [video.id]);

  // Set up intersection observer for center detection
  useEffect(() => {
    // Detect device capabilities and screen size
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isMobile = screenWidth <= 768; // Mobile breakpoint
    const isTablet = screenWidth > 768 && screenWidth <= 1024; // Tablet breakpoint
    const isDesktop = screenWidth > 1024; // Desktop breakpoint
    
    // Determine if scroll-based autoplay should be enabled (only mobile/tablet, NOT desktop)
    const shouldEnableScrollAutoplay = (isTouchDevice || isMobile || isTablet) && !isDesktop;
    
    console.log(`VideoCard ${video.id}: Device detection - Touch: ${isTouchDevice}, Screen: ${screenWidth}x${screenHeight}, Mobile: ${isMobile}, Tablet: ${isTablet}, Desktop: ${isDesktop}, ScrollAutoplayEnabled: ${shouldEnableScrollAutoplay}`);
    
    // Only set up observer for video content when scroll autoplay is appropriate (mobile/tablet only)
    if (video.contentType !== "video" || !video.videoUrl || !shouldEnableScrollAutoplay) {
      console.log(`VideoCard ${video.id}: Skipping intersection observer setup - ${isDesktop ? 'Desktop uses hover instead' : 'Not applicable'}`);
      return;
    }

    console.log(`VideoCard ${video.id}: Setting up intersection observer for ${isMobile ? 'mobile' : 'tablet'} scroll autoplay`);

    // Responsive intersection observer options based on screen size (only mobile/tablet)
    let rootMargin, threshold;
    
    if (isMobile) {
      // Mobile: Tighter detection for smaller screens
      rootMargin = "-25% 0px -25% 0px"; // 50% center band
      threshold = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    } else {
      // Tablet (iPad): Balanced detection for medium screens
      rootMargin = "-20% 0px -20% 0px"; // 60% center band
      threshold = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    }

    const options = {
      root: null,
      rootMargin,
      threshold,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        // Responsive intersection ratio thresholds
        const requiredRatio = isMobile ? 0.5 : 0.4; // 50% on mobile, 40% on tablet
        
        const isCentered = entry.isIntersecting && entry.intersectionRatio >= requiredRatio;
        
        console.log(`VideoCard ${video.id}: Intersection - Device: ${isMobile ? 'mobile' : 'tablet'}, isIntersecting: ${entry.isIntersecting}, ratio: ${entry.intersectionRatio.toFixed(2)}, required: ${requiredRatio}, isCentered: ${isCentered}`);
        
        setIsInCenter(isCentered);
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, options);

    if (cardRef.current) {
      observerRef.current.observe(cardRef.current);
      console.log(`VideoCard ${video.id}: Observer attached to card element`);
    }

    // Handle window resize to update observer settings
    const handleResize = () => {
      if (observerRef.current && cardRef.current) {
        observerRef.current.disconnect();
        // Re-run this effect with new screen dimensions
        const newWidth = window.innerWidth;
        console.log(`VideoCard ${video.id}: Screen resized to ${newWidth}px, updating observer`);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        console.log(`VideoCard ${video.id}: Observer disconnected`);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [video.contentType, video.videoUrl]);

  // Separate effect to handle video playback based on center state OR hover state
  useEffect(() => {
    if (!videoRef.current || video.contentType !== "video") return;

    // Get current screen size for device detection
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;
    const isTablet = screenWidth > 768 && screenWidth <= 1024;
    const isDesktop = screenWidth > 1024;
    
    // Determine playback trigger: scroll for mobile/tablet, hover for desktop
    const shouldPlay = isDesktop ? isHovered : isInCenter;
    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const triggerType = isDesktop ? 'hover' : 'scroll';
    
    // Responsive timing delays
    const playDelay = isMobile ? 50 : isTablet ? 100 : 200; // Slightly slower for desktop hover

    console.log(`VideoCard ${video.id}: Playback state change - shouldPlay: ${shouldPlay} (${triggerType}), device: ${deviceType}`);

    if (shouldPlay) {
      // Check if this video is allowed to play before starting
      if (!isVideoAllowedToPlay(videoRef.current)) {
        console.log(`VideoCard ${video.id}: Video not allowed to play, pausing all videos first`);
        pauseAllVideos();
      }
      
      // Set this as the current playing video (this will pause others)
      setCurrentPlayingVideo(videoRef.current);
      
      // Start this video
      videoRef.current.currentTime = 0;
      
      // Force muted state for mobile autoplay - crucial for iOS/Android
      const isMobile = screenWidth <= 768;
      if (isMobile) {
        videoRef.current.muted = true;
        // Ensure mobile attributes are properly set
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.setAttribute('x5-playsinline', 'true');
      } else {
        videoRef.current.muted = isMuted;
      }
      
      console.log(`VideoCard ${video.id}: Starting video playback with ${playDelay}ms delay for ${deviceType} ${triggerType}`);
      
      // Responsive delay based on device type and trigger
      setTimeout(() => {
        if (videoRef.current && shouldPlay && isVideoAllowedToPlay(videoRef.current)) {
          videoRef.current.play().catch((error) => {
            console.log("Autoplay failed for video", video.id, ":", error);
          });
        }
      }, playDelay);
    } else {
      // Pause this video when trigger condition is no longer met
      if (videoRef.current && !videoRef.current.paused) {
        console.log(`VideoCard ${video.id}: Pausing video playback (${triggerType} ended)`);
        videoRef.current.pause();
        setCurrentPlayingVideo(null);
      }
    }
  }, [isInCenter, isHovered, isMuted, setCurrentPlayingVideo, pauseAllVideos, isVideoAllowedToPlay, video.id, video.contentType]);

  // Format duration helper
  const formatDuration = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
  };

  // Handle like action
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikeLoading) return;

    setIsLikeLoading(true);
    try {
      const response = await apiRequest(
        isLiked ? "DELETE" : "POST",
        `/api/videos/${video.id}/like`
      );
      const data = await response.json();
      setIsLiked(!isLiked);
      setLikeCount(data.count || 0);
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: isLiked ? "Error removing like" : "Error adding like",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLikeLoading(false);
    }
  };

  // Handle report action
  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open the media detail page with the report dialog in a new tab
    const slug = createSeoFriendlySlug(video);
    window.open(`/media/${slug}?report=true`, "_blank");
  };

  // Handle preview click
  const handlePreview = () => {
    // Use SEO-friendly URL with slug
    const slug = createSeoFriendlySlug(video);
    console.log(`Navigating to video with slug: ${slug}`);
    // Use direct navigation with ID instead for reliability
    window.location.href = `/media/${video.id}`;
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const screenWidth = window.innerWidth;
      const isMobile = screenWidth <= 768;
      
      // On mobile, videos must stay muted for autoplay to work
      if (isMobile) {
        console.log("Mute toggle disabled on mobile - videos must stay muted for autoplay");
        return;
      }
      
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      
      // If the video is currently playing and we're unmuting, ensure it continues to play
      if (!newMutedState && isInCenter && videoRef.current.paused) {
        videoRef.current.play().catch((error) => {
          console.log("Error playing video after unmute:", error);
        });
      }
    }
  };

  useEffect(() => {
    const fetchUsername = async () => {
      // Check if we already have the uploaderName from the API
      if (video.uploaderName) {
        setUsername(video.uploaderName);
        return;
      }

      // Otherwise fetch the username if we have userId
      if (video.userId) {
        try {
          const response = await apiRequest(
            "GET",
            `/api/users/${video.userId}/profile`
          );
          const data = await response.json();
          if (data && data.username) {
            setUsername(data.username);
          }
        } catch (error) {
          console.error("Error fetching username:", error);
        }
      }
    };
    fetchUsername();
  }, [video.userId, video.uploaderName]);

  useEffect(() => {
    const fetchLikeStatus = async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/videos/${video.id}/like`
        );
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikeCount(data.count || 0);
      } catch (error) {
        console.error("Error fetching like status:", error);
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

  // Create dynamic sizing classes
  const sizeClass = {
    small: "w-full",
    default: "w-full",
    medium: "w-full",
    large: "w-full max-w-4xl mx-auto",
  }[size];

  console.log(`VideoCard: Rendering video ${video.id} ===> ${video}`);

  return (
    <div
      ref={cardRef}
      className={`video-card thumbnail-item relative rounded overflow-hidden bg-[#0f172a] hover:ring-2 hover:ring-orange-500/50 transition-all ${sizeClass}`}
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

        {/* Video Preview Layer - Responsive: hover for desktop, scroll for mobile/tablet */}
        {video.contentType === "video" && video.videoUrl && (
          <div className="absolute inset-0">
            {(() => {
              const screenWidth = window.innerWidth;
              const isDesktop = screenWidth > 1024;
              const shouldShowVideo = isDesktop ? isHovered : (isHovered || isInCenter);
              return shouldShowVideo;
            })() ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  src={video.videoUrl}
                  poster={checkThumbnail(video.thumbnail || "", video.id)}
                  muted={true}
                  loop
                  playsInline
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  x5-video-player-type="h5"
                  x5-video-player-fullscreen="true"
                  x-webkit-airplay="allow"
                  preload="metadata"
                  controls={false}
                  disablePictureInPicture
                  disableRemotePlayback
                  onLoadedData={() => {
                    // Responsive timing and trigger detection
                    const screenWidth = window.innerWidth;
                    const isDesktop = screenWidth > 1024;
                    const isMobile = screenWidth <= 768;
                    const loadDelay = isMobile ? 25 : 50;
                    const shouldPlay = isDesktop ? isHovered : isInCenter;
                    
                    // Ensure video is always muted for mobile autoplay
                    if (videoRef.current) {
                      videoRef.current.muted = true;
                      // Force mobile-specific attributes
                      videoRef.current.setAttribute('muted', 'true');
                      videoRef.current.setAttribute('playsinline', 'true');
                      videoRef.current.setAttribute('webkit-playsinline', 'true');
                      videoRef.current.setAttribute('x5-playsinline', 'true');
                    }
                    
                    // Ensure video plays when loaded and trigger is active
                    if (shouldPlay && videoRef.current && isVideoAllowedToPlay(videoRef.current)) {
                      setTimeout(() => {
                        if (videoRef.current && shouldPlay && isVideoAllowedToPlay(videoRef.current)) {
                          videoRef.current.play().catch((error) => {
                            console.log("Autoplay failed on loadedData:", error);
                          });
                        }
                      }, loadDelay);
                    }
                  }}
                  onPlay={() => {
                    // When this video starts playing, make sure it's registered as the current video
                    // and that no other videos are playing
                    if (videoRef.current) {
                      if (!isVideoAllowedToPlay(videoRef.current)) {
                        console.log(`VideoCard ${video.id}: Video started playing but not allowed, pausing immediately`);
                        videoRef.current.pause();
                        return;
                      }
                      setCurrentPlayingVideo(videoRef.current);
                      console.log(`VideoCard ${video.id}: Video started playing successfully`);
                    }
                  }}
                  onPause={() => {
                    // When this video pauses, clear it from the context if it was the current one
                    if (videoRef.current) {
                      setCurrentPlayingVideo(null);
                      console.log(`VideoCard ${video.id}: Video paused`);
                    }
                  }}
                />
                {/* Only show mute button when video is actually playing and not on mobile */}
                {(() => {
                  const screenWidth = window.innerWidth;
                  const isDesktop = screenWidth > 1024;
                  const isMobile = screenWidth <= 768;
                  const shouldShowButton = !isMobile && (isDesktop ? isHovered : isInCenter);
                  return shouldShowButton;
                })() && (
                  <button
                    onClick={toggleMute}
                    className="absolute top-2 right-2 p-2 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors z-20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </>
            ) : (
              <img
                src={checkThumbnail(video.thumbnail || "", video.id)}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {/* YouTube Preview Layer */}
        {video.contentType === "embed" && video.embedCode && isHovered && (
          <div className="absolute inset-0 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${extractYoutubeIdFromEmbed(
                video.embedCode
              )}?autoplay=1&mute=1&controls=0&modestbranding=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
            />
          </div>
        )}

        {/* Hover Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-40"
          }`}
        />

        {/* Duration Badge */}
        {video.contentType !== "image" &&
          video.duration &&
          video.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded z-10">
              {formatDuration(video.duration)}
            </div>
          )}
      </div>

      {/* Video Info Section */}
      <div className="p-3">
        <h3 className="font-medium text-base md:text-lg truncate text-white">
          {video.title}
        </h3>

        {/* Tags display */}
        {video.tags && (
          <div className="flex flex-wrap gap-1 mt-1">
            {video.tags
              .split(",")
              .slice(0, 3)
              .map((tag, index) => (
                <span
                  key={index}
                  className="inline-block bg-gray-800/80 text-gray-300 rounded px-1.5 py-0.5 text-[10px]"
                >
                  #{tag.trim()}
                </span>
              ))}
            {video.tags.split(",").length > 3 && (
              <span className="inline-block text-gray-400 text-[10px]">
                +{video.tags.split(",").length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-2 text-sm">
          <div className="text-gray-400">
            <span style={{ color: "#9333ea" }}>
              {video.categoryName || "Category"}{" "}
            </span>
            •{" "}
            {video.aiGenerator || "AI Artist"}{" "}
            {(video.uploaderName || username) && (
              <>
                •{" "}
                <Link
                  to={`/user/${video.uploaderName || username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-orange-500 hover:text-orange-400 hover:underline"
                >
                  {video.uploaderName || username}
                </Link>
              </>
            )}
          </div>

          <div className="flex space-x-1">
            <button
              onClick={handleLike}
              className={`flex items-center px-2 py-1 rounded transition-colors ${
                isLiked
                  ? "text-orange-500 bg-orange-950/40"
                  : "text-gray-400 hover:text-orange-400"
              }`}
              disabled={isLikeLoading}
              title={isLiked ? "Unlike" : "Like"}
            >
              <ThumbsUp
                className={`h-4 w-4 ${isLikeLoading ? "animate-pulse" : ""}`}
              />
            </button>

            <button
              onClick={handleReport}
              className="flex items-center px-2 py-1 rounded transition-colors text-gray-400 hover:text-orange-400"
              title="Report"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
