import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import VimeoEmbed from './VimeoEmbed';
import AIWatermark from './AIWatermark';
import { Video } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  extractYoutubeVideoId, 
  extractYoutubeIdFromEmbed,
  isRedditEmbed,
  extractRedditInfo 
} from '@/lib/utils';

interface VideoPlayerProps {
  videoId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoPlayer({ videoId, isOpen, onClose }: VideoPlayerProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();
  
  // Handler for report button
  const handleReport = () => {
    if (video) {
      if (window.confirm(`Are you sure you want to report "${video.title}" for violating our Terms of Service?`)) {
        // Here we would normally make an API call to report the video
        alert("Thank you for your report. Our moderation team will review this content.");
      }
    }
  };
  
  // Handler for like button
  const handleLike = async () => {
    if (!videoId || isLikeLoading) return;
    
    setIsLikeLoading(true);
    try {
      let response;
      if (isLiked) {
        // Unlike the video
        response = await apiRequest('DELETE', `/api/videos/${videoId}/like`);
      } else {
        // Like the video
        response = await apiRequest('POST', `/api/videos/${videoId}/like`);
      }
      
      const data = await response.json();
      setIsLiked(data.isLiked);
      setLikeCount(data.count || 0);
      
      // Show a toast message
      toast({
        title: isLiked ? 'Like removed' : 'Content liked',
        description: isLiked ? 'You removed your like from this content' : 'You liked this content',
      });
      
      // Invalidate the query to update other components
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/like`] });
    } catch (err) {
      console.error('Error toggling like:', err);
      toast({
        title: 'Error',
        description: 'Could not process your like. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLikeLoading(false);
    }
  };
  
  // This effect loads the video data
  useEffect(() => {
    // Only log if the player is actually being opened (don't log initial state)
    if (isOpen) {
      console.log("VideoPlayer: Opening with videoId:", videoId);
    }
    
    if (!isOpen || !videoId) return;

    const fetchVideo = async () => {
      console.log("VideoPlayer: Fetching video with ID:", videoId);
      setLoading(true);
      setError(null);
      
      try {
        console.log("VideoPlayer: Making API request to /api/videos/" + videoId);
        const response = await apiRequest('GET', `/api/videos/${videoId}`);
        if (!response.ok) {
          throw new Error(`Error fetching video: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("VideoPlayer: Received video data:", {
          ...data,
          videoUrl: data.videoUrl ? `${data.videoUrl.substring(0, 100)}${data.videoUrl.length > 100 ? '...' : ''}` : null,
          imageUrl: data.imageUrl ? `${data.imageUrl.substring(0, 100)}${data.imageUrl.length > 100 ? '...' : ''}` : null,
          contentType: data.contentType,
          hasVideoUrl: !!data.videoUrl,
        });
        
        if (!data) {
          throw new Error("No video data returned from server");
        }
        
        setVideo(data);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId, isOpen]);
  
  // This effect handles creating the embed iframes when the video is an embed
  // Fetch like status
  useEffect(() => {
    if (!isOpen || !videoId) return;
    
    const fetchLikeStatus = async () => {
      try {
        const response = await apiRequest('GET', `/api/videos/${videoId}/like`);
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikeCount(data.count || 0);
      } catch (err) {
        console.error('Error fetching like status:', err);
      }
    };
    
    fetchLikeStatus();
  }, [videoId, isOpen]);
  
  // Process embed code
  useEffect(() => {
    if (!isOpen || !video || video.contentType !== 'embed' || !video.embedCode) return;
    
    console.log("VideoPlayer: Processing embed code", { 
      isRedditEmbed: video.embedCode ? isRedditEmbed(video.embedCode) : false,
      embedLength: video.embedCode.length
    });
    
    // Reference to prevent race conditions
    const containerRef = embedContainerRef.current;
    if (!containerRef) return;
    
    // Clear previous content
    containerRef.innerHTML = '';
    
    // Always use the server-provided embed code first
    // The server has already handled adding autoplay parameters
    // This ensures all the YouTube iframe attributes are properly set
    containerRef.innerHTML = video.embedCode;
    
    // Check if it's a YouTube embed but doesn't have autoplay for some reason
    const hasYouTube = video.embedCode.includes('youtube.com/embed/');
    const hasAutoplay = video.embedCode.includes('autoplay=1');
    
    if (hasYouTube && !hasAutoplay) {
      // Try to extract YouTube ID using different methods
      let youtubeId = null;
      
      // Method 1: Extract from iframe embed
      const iframeMatch = video.embedCode.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (iframeMatch) {
        youtubeId = iframeMatch[1];
      } 
      // Method 2: Extract from embed code
      else {
        const idFromEmbed = extractYoutubeIdFromEmbed(video.embedCode);
        if (idFromEmbed) {
          youtubeId = idFromEmbed;
        } 
        // Method 3: Extract directly from URL
        else {
          const idFromUrl = extractYoutubeVideoId(video.embedCode);
          if (idFromUrl) {
            youtubeId = idFromUrl;
          }
        }
      }
      
      if (youtubeId) {
        console.log("VideoPlayer: Creating YouTube embed with ID:", youtubeId);
        
        // Create a direct iframe with autoplay enabled
        containerRef.innerHTML = `
          <iframe 
            src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&rel=0" 
            width="100%" 
            height="100%" 
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:4px;" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen 
            title="${video.title || 'YouTube video'}"
          ></iframe>
        `;
      }
    }
    // Next, check if it's a Reddit embed
    else if (video.embedCode.includes('reddit.com')) {
      console.log("VideoPlayer: Creating Reddit embed");
      
      // Extract information using the most reliable method first - data attributes
      const dataMatch = video.embedCode.match(/data-reddit-subreddit="([^"]+)"[^>]*data-reddit-postid="([^"]+)"/);
      
      // If we have the data attributes, use them
      if (dataMatch) {
        const subreddit = dataMatch[1];
        const postId = dataMatch[2];
        console.log("VideoPlayer: Using Reddit info from data attributes:", subreddit, postId);
        
        // Create a simpler direct embed
        containerRef.innerHTML = `
          <div style="position:relative;height:0;padding-bottom:56.25%;">
            <iframe 
              src="https://www.reddit.com/r/${subreddit}/comments/${postId}/embed/" 
              width="100%" 
              height="100%" 
              style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" 
              allowfullscreen
              title="${video.title || 'Reddit content'}"
            ></iframe>
            <div style="position:absolute;bottom:15px;right:15px;background:rgba(0,0,0,0.7);color:white;padding:8px 12px;border-radius:4px;font-size:14px;cursor:pointer;z-index:10;"
                onclick="window.open('https://www.reddit.com/r/${subreddit}/comments/${postId}/', '_blank')">
              View on Reddit
            </div>
          </div>
        `;
      } 
      // Fallback to URL pattern extraction
      else {
        const urlMatch = video.embedCode.match(/reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)/);
        if (urlMatch) {
          const subreddit = urlMatch[1];
          const postId = urlMatch[2];
          console.log("VideoPlayer: Using Reddit info from URL pattern:", subreddit, postId);
          
          containerRef.innerHTML = `
            <div style="position:relative;height:0;padding-bottom:56.25%;">
              <iframe 
                src="https://www.reddit.com/r/${subreddit}/comments/${postId}/embed/" 
                width="100%" 
                height="100%" 
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" 
                allowfullscreen
                title="${video.title || 'Reddit content'}"
              ></iframe>
              <div style="position:absolute;bottom:15px;right:15px;background:rgba(0,0,0,0.7);color:white;padding:8px 12px;border-radius:4px;font-size:14px;cursor:pointer;z-index:10;"
                  onclick="window.open('https://www.reddit.com/r/${subreddit}/comments/${postId}/', '_blank')">
                View on Reddit
              </div>
            </div>
          `;
        } 
        // Last resort - just use the original embed code
        else {
          console.log("VideoPlayer: Falling back to provided embed code for Reddit");
          containerRef.innerHTML = video.embedCode;
          
          // Add the Reddit script if it's not already there
          if (!video.embedCode.includes('embed.reddit.com/widgets.js')) {
            const script = document.createElement('script');
            script.src = 'https://embed.reddit.com/widgets.js';
            script.async = true;
            script.charset = 'UTF-8';
            containerRef.appendChild(script);
          }
        }
      }
    }
    // Generic embed code (for other platforms)
    else {
      // Just insert the embed code as-is for other platforms
      containerRef.innerHTML = video.embedCode;
    }
  }, [isOpen, video]);

  // Effect to cleanup video elements when dialog closes
  useEffect(() => {
    return () => {
      // When component unmounts or dialog closes, pause and cleanup all video elements
      if (!isOpen) {
        console.log('VideoPlayer: Cleaning up and stopping all videos');
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(videoEl => {
          try {
            if (!videoEl.paused) {
              videoEl.pause();
              console.log('Video paused on dialog close');
            }
            // Remove src to stop downloading
            videoEl.removeAttribute('src');
            videoEl.load();
          } catch (e) {
            console.error('Error pausing video:', e);
          }
        });

        // Clear the video reference
        if (videoRef.current) {
          videoRef.current = null;
        }
      }
    };
  }, [isOpen]);

  // Create MP4 player with autoplay and improved error handling
  const renderMP4Player = () => {
    if (!video || !video.videoUrl) return null;
    
    return (
      <div className="relative w-full h-full">
        {/* Create a ref-based video element to ensure proper control */}
        <div 
          className="w-full h-full" 
          ref={el => {
            if (!el || !video?.videoUrl) return;
            
            // Clear previous content
            el.innerHTML = '';
            
            // Create video element
            const videoEl = document.createElement('video');
            videoEl.controls = true;
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.className = 'w-full h-full';
            videoEl.muted = false;
            if (video.videoUrl) {
              videoEl.src = video.videoUrl;
            }
            
            if (video.thumbnail) {
              videoEl.poster = video.thumbnail;
            }
            
            // Store reference to the video element for cleanup
            videoRef.current = videoEl;
            
            // Add event listeners for debugging
            videoEl.addEventListener('loadstart', () => console.log('MP4 video: loadstart'));
            videoEl.addEventListener('loadedmetadata', () => console.log('MP4 video: loadedmetadata'));
            videoEl.addEventListener('canplay', () => {
              console.log('MP4 video: canplay');
              // Force play after canplay event
              videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
            });
            
            // Error handling
            videoEl.addEventListener('error', (e) => {
              console.error('MP4 video error:', e);
              if (videoEl.error) {
                console.error('Error code:', videoEl.error.code, 'Message:', videoEl.error.message);
              }
              
              // Hide the video element
              videoEl.style.display = 'none';
              
              // Add error message
              const errorDiv = document.createElement('div');
              errorDiv.className = 'absolute inset-0 flex items-center justify-center';
              errorDiv.innerHTML = `
                <div class="bg-black/70 p-4 rounded-md text-center max-w-md">
                  <p class="text-red-500 text-lg mb-2">Unable to play this video</p>
                  <p class="text-gray-300 text-sm">The video format may be unsupported in your browser.</p>
                </div>
              `;
              el.appendChild(errorDiv);
            });
            
            // Add video to container
            el.appendChild(videoEl);
            
            // Force play with delay (helps with some browsers)
            setTimeout(() => {
              if (isOpen && videoEl) { // Only play if dialog still open
                videoEl.play().catch(e => console.warn('Delayed autoplay prevented:', e));
              }
            }, 300);
          }}
        >
          {/* Fallback content while video loads */}
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="animate-pulse">
              <Loader2 className="h-10 w-10 text-primary" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Function to handle dialog close with proper cleanup
  const handleCloseDialog = () => {
    // Pause all video elements first
    document.querySelectorAll('video').forEach(videoEl => {
      try {
        if (!videoEl.paused) {
          videoEl.pause();
          console.log('Video paused on dialog close');
        }
        // Remove src to stop downloading
        videoEl.removeAttribute('src');
        videoEl.load();
      } catch (e) {
        console.error('Error stopping video:', e);
      }
    });
    
    // Clear specific video reference
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch (e) {
        console.error('Error cleaning up video ref:', e);
      }
      videoRef.current = null;
    }
    
    // Clear iframes if needed
    if (embedContainerRef.current) {
      embedContainerRef.current.innerHTML = '';
    }
    
    // Then call the original onClose
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogTitle className="sr-only">Media viewer</DialogTitle>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw] bg-[#1a1a1a] border-gray-800 p-0">
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={handleCloseDialog}
            className="bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-16" aria-live="polite">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="Loading video" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500" aria-live="assertive">
            <p>{error}</p>
          </div>
        ) : video ? (
          <div className="flex flex-col">
            {/* Media section */}
            <div className="bg-black relative">
              {video.vimeoId ? (
                <div className="relative">
                  <VimeoEmbed
                    videoId={video.vimeoId}
                    title={video.title}
                    autoplay={true}
                    loop={false}
                    responsive={true}
                    showTitle={false}
                    showByline={false}
                    showPortrait={false}
                  />
                  <AIWatermark position="bottom-right" size="medium" />
                </div>
              ) : video.contentType === 'embed' && video.embedCode ? (
                <div className="aspect-video w-full">
                  <div 
                    className="w-full h-full relative embed-container"
                    style={{ paddingBottom: '56.25%' }}
                  >
                    <div 
                      ref={embedContainerRef}
                      className="absolute inset-0"
                    />
                    {/* Add AI watermark on top of the embedded content */}
                    <AIWatermark position="bottom-right" size="medium" />
                    <style dangerouslySetInnerHTML={{__html: `
                      .embed-container iframe,
                      .embed-container object,
                      .embed-container embed {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                      }
                    `}} />
                  </div>
                </div>
              ) : video.contentType === 'video' && video.videoUrl ? (
                <div className="bg-black flex items-center justify-center aspect-video w-full relative">
                  {/* Add AI watermark for all videos */}
                  <AIWatermark position="bottom-right" size="medium" />
                  
                  {/* Improved MP4 video handling */}
                  {video.videoUrl.includes('.mp4') || video.videoUrl.includes('video/mp4') || video.videoUrl.startsWith('/uploads/') ? (
                    renderMP4Player()
                  ) : (
                    // For other video types, use the src attribute directly
                    <video 
                      controls 
                      autoPlay 
                      className="w-full h-full" 
                      src={video.videoUrl}
                      poster={video.thumbnail || undefined}
                      onError={(e) => {
                        console.error("Error playing video:", e);
                        // If the video element is available, try to show error details
                        const videoEl = e.currentTarget;
                        videoEl.style.display = 'none';
                        
                        // Add error message to parent
                        if (videoEl.parentElement) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'absolute inset-0 flex items-center justify-center';
                          errorDiv.innerHTML = `
                            <div class="bg-black/70 p-4 rounded-md text-center max-w-md">
                              <p class="text-red-500 text-lg mb-2">Unable to play this video</p>
                              <p class="text-gray-300 text-sm">The video format may be unsupported.</p>
                            </div>
                          `;
                          videoEl.parentElement.appendChild(errorDiv);
                        }
                      }}
                    />
                  )}
                </div>
              ) : video.contentType === 'image' ? (
                <div className="flex flex-col items-center justify-center bg-black p-4 max-h-[70vh] overflow-auto relative">
                  {/* Add AI watermark for all images */}
                  <AIWatermark position="bottom-right" size="medium" />
                  
                  {/* Check for data URLs which are usually properly formatted images */}
                  {video.imageUrl ? (
                    <img 
                      src={video.imageUrl} 
                      alt={video.title} 
                      className="max-h-[70vh] object-contain"
                      onError={(e) => {
                        console.error("Error loading image");
                        const imgEl = e.currentTarget;
                        imgEl.style.display = 'none';
                        
                        // Add error message if possible
                        if (imgEl.parentElement) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'bg-red-600/20 border border-red-600 rounded-md p-4 text-center';
                          errorDiv.textContent = 'Image could not be loaded. It may be in an unsupported format.';
                          imgEl.parentElement.appendChild(errorDiv);
                        }
                      }}
                    />
                  ) : (
                    <div className="text-red-500">Image data not available</div>
                  )}
                </div>
              ) : (
                <div className="bg-black aspect-video flex items-center justify-center">
                  <div className="text-center p-8 bg-gray-800/50 rounded-lg">
                    <h3 className="text-red-400 text-xl font-semibold">Unsupported Content Type</h3>
                    <p className="text-gray-300 mt-2">
                      This content type ({video.contentType || 'unknown'}) cannot be displayed.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Info section */}
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{video.title}</h2>
                  {video.createdAt && (
                    <p className="text-gray-400 text-sm mt-1">
                      Uploaded {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleLike}
                    disabled={isLikeLoading}
                    className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors ${isLiked ? 'bg-primary text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    <ThumbsUp size={16} className={isLikeLoading ? 'animate-pulse' : ''} />
                    <span>{isLiked ? 'Liked' : 'Like'}</span>
                    {likeCount > 0 && <span className="ml-1">({likeCount})</span>}
                  </button>
                  
                  <button
                    onClick={handleReport}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-full flex items-center gap-1"
                  >
                    <i className="fas fa-flag text-sm"></i>
                    <span>Report</span>
                  </button>
                </div>
              </div>
              
              <div className="flex gap-4 mb-4 flex-wrap">
                {video.aiGenerator && (
                  <div className="bg-gray-800 rounded-md px-3 py-1 text-sm">
                    <span className="text-gray-400">AI: </span>
                    <span className="text-primary">{video.aiGenerator}</span>
                  </div>
                )}
                
                {video.categoryId && (
                  <div className="bg-gray-800 rounded-md px-3 py-1 text-sm">
                    <span className="text-gray-400">Category: </span>
                    <span className="text-blue-400">{'Category ' + video.categoryId}</span>
                  </div>
                )}
                
                {video.contentType && (
                  <div className="bg-gray-800 rounded-md px-3 py-1 text-sm">
                    <span className="text-gray-400">Type: </span>
                    <span className="text-yellow-400">{
                      video.contentType === 'video' ? 'Video' :
                      video.contentType === 'image' ? 'Image' :
                      video.contentType === 'embed' ? 'Embedded Content' :
                      video.contentType
                    }</span>
                  </div>
                )}
                
                {video.resolution && (
                  <div className="bg-gray-800 rounded-md px-3 py-1 text-sm">
                    <span className="text-gray-400">Quality: </span>
                    <span className="text-green-400">{video.resolution}</span>
                  </div>
                )}
              </div>
              
              {video.description && (
                <div className="mt-4 border-t border-gray-800 pt-4">
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Description</h3>
                  <p className="text-gray-400 whitespace-pre-line">{video.description}</p>
                </div>
              )}
              
              {video.prompt && (
                <div className="mt-4 border-t border-gray-800 pt-4">
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Prompt Used</h3>
                  <p className="text-gray-400 whitespace-pre-line bg-gray-800/50 p-3 rounded-md font-mono text-sm">{video.prompt}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p>No content available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}