import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import VimeoEmbed from './VimeoEmbed';
import AIWatermark from './AIWatermark';
import { Video } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
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
  const embedContainerRef = useRef<HTMLDivElement>(null);
  
  // Handler for report button
  const handleReport = () => {
    if (video) {
      if (window.confirm(`Are you sure you want to report "${video.title}" for violating our Terms of Service?`)) {
        // Here we would normally make an API call to report the video
        alert("Thank you for your report. Our moderation team will review this content.");
      }
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
    
    // First, determine if it's a YouTube video
    if (video.embedCode.includes('youtube.com') || video.embedCode.includes('youtu.be')) {
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
      } else {
        // Fallback to the original embed code
        containerRef.innerHTML = video.embedCode;
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogTitle className="sr-only">Media viewer</DialogTitle>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw] bg-[#1a1a1a] border-gray-800 p-0">
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={onClose}
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
                  {/* Remove debug info in production */}
                  {/* <div className="absolute top-2 left-2 z-10 bg-black/80 text-xs text-white p-1 rounded opacity-50 hover:opacity-100">
                    MP4 Debug: {video.videoUrl ? (video.videoUrl.length > 20 ? video.videoUrl.substring(0, 20) + '...' : video.videoUrl) : 'No URL'}
                  </div> */}
                  
                  {/* Add AI watermark for all videos */}
                  <AIWatermark position="bottom-right" size="medium" />
                  
                  {/* Try different approach for mp4 videos */}
                  {video.videoUrl.includes('.mp4') || video.videoUrl.includes('video/mp4') || video.videoUrl.startsWith('/uploads/') ? (
                    // For MP4 videos and server-hosted files, use a source element inside video instead of src attribute
                    <video 
                      src={video.videoUrl}
                      controls 
                      autoPlay 
                      muted={false}
                      playsInline
                      preload="auto"
                      className="w-full h-full" 
                      poster={video.thumbnail || undefined}
                      onError={(e) => {
                        console.error("Error playing MP4 video:", e);
                        const videoEl = e.currentTarget;
                        console.log("Video element:", videoEl);
                        if (videoEl.error) {
                          console.log("Video error code:", videoEl.error.code);
                          console.log("Video error message:", videoEl.error.message);
                        }
                        
                        // Create fallback for data URLs that may be corrupted
                        if (video.videoUrl && video.videoUrl.startsWith('data:') && videoEl.parentElement) {
                          console.log("Attempting alternative playback method for data URL");
                          
                          // Hide the failed video element
                          videoEl.style.display = 'none';
                          
                          // Create a blob from the data URL
                          try {
                            // Safe copy for TypeScript
                            const videoUrl = video.videoUrl;
                            // Try creating an object URL directly
                            fetch(videoUrl)
                              .then(res => res.blob())
                              .then(blob => {
                                // Create an object URL from the blob
                                const url = URL.createObjectURL(blob);
                                
                                // Create a new video element with the object URL
                                const newVideo = document.createElement('video');
                                newVideo.src = url;
                                newVideo.className = "max-h-[70vh] max-w-full";
                                newVideo.controls = true;
                                newVideo.autoplay = true;
                                
                                // Add the new video element to the DOM
                                if (videoEl.parentElement) {
                                  videoEl.parentElement.appendChild(newVideo);
                                }
                              })
                              .catch(err => {
                                console.error("Failed to create blob from data URL:", err);
                                // Show error message
                                if (videoEl.parentElement) {
                                  const errorDiv = document.createElement('div');
                                  errorDiv.className = 'bg-red-600/20 border border-red-600 rounded-md p-4 text-center';
                                  errorDiv.innerHTML = `
                                    <h3 class="text-red-400 text-lg font-semibold mb-2">
                                      <i class="fas fa-exclamation-circle mr-2"></i>
                                      Video Playback Error
                                    </h3>
                                    <p class="text-gray-300 mb-2">
                                      The video could not be played. It may be corrupted or in an unsupported format.
                                    </p>
                                    <div class="text-xs text-gray-400 bg-black/50 p-2 rounded mt-2 text-left overflow-auto max-h-24">
                                      <p>Error: Failed to create playable video from data URL</p>
                                      <p>Error details: ${err.message}</p>
                                      <p>Try downloading the video instead and playing it locally</p>
                                    </div>
                                  `;
                                  videoEl.parentElement.appendChild(errorDiv);
                                }
                              });
                          } catch (err) {
                            console.error("Error processing data URL:", err);
                          }
                        }
                      }}
                    >
                      <source src={video.videoUrl || ''} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
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
                        
                        // Helper function to show error message - define outside to avoid strict mode issues
                        const showErrorMessage = () => {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'bg-red-600/20 border border-red-600 rounded-md p-4 text-center';
                          
                          // Create safe local references to values
                          const safeVideoUrl = video?.videoUrl || 'Not available';
                          const displayUrl = safeVideoUrl.length > 100 ? safeVideoUrl.substring(0, 100) + '...' : safeVideoUrl;
                          const errorCode = videoEl.error ? videoEl.error.code : 'Unknown';
                          const errorMessage = videoEl.error ? videoEl.error.message : 'Unknown error';
                          
                          errorDiv.innerHTML = `
                            <h3 class="text-red-400 text-lg font-semibold mb-2">
                              <i class="fas fa-exclamation-circle mr-2"></i>
                              Video Playback Error
                            </h3>
                            <p class="text-gray-300 mb-2">
                              The video could not be played. It may be in an unsupported format or corrupted.
                            </p>
                            <div class="text-xs text-gray-400 bg-black/50 p-2 rounded mt-2 text-left overflow-auto max-h-24">
                              <p>Video URL: ${displayUrl}</p>
                              <p>Error code: ${errorCode}</p>
                              <p>Error message: ${errorMessage}</p>
                            </div>
                            <div class="mt-4">
                              <a href="${safeVideoUrl}" download target="_blank" class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded inline-flex items-center mt-2">
                                <i class="fas fa-download mr-2"></i>
                                Download Video
                              </a>
                            </div>
                          `;
                          
                          const parentElement = videoEl.parentElement;
                          if (parentElement) {
                            parentElement.appendChild(errorDiv);
                          }
                        };
                        
                        // Main error handling logic
                        if (videoEl.parentElement) {
                          videoEl.style.display = 'none';
                          
                          // Try creating a source element approach as a fallback
                          if (video && video.videoUrl) {
                            try {
                              console.log("Trying alternative video playback method with source element");
                              
                              // Create a local reference to ensure videoUrl is not null
                              const videoUrl = video.videoUrl;
                              
                              // Try to determine content type
                              let contentType = "video/mp4"; // Default
                              if (videoUrl.includes('webm')) {
                                contentType = "video/webm";
                              } else if (videoUrl.includes('ogg') || videoUrl.includes('ogv')) {
                                contentType = "video/ogg";
                              } else if (videoUrl.includes('mov') || videoUrl.includes('quicktime')) {
                                contentType = "video/quicktime";
                              }
                              
                              // Create new video element with source
                              const newVideo = document.createElement('video');
                              newVideo.controls = true;
                              newVideo.autoplay = true;
                              newVideo.className = "max-h-[70vh] max-w-full";
                              
                              // Set poster if available
                              if (video.thumbnail) {
                                newVideo.poster = video.thumbnail;
                              }
                              
                              // Create and add source element
                              const source = document.createElement('source');
                              source.src = videoUrl;
                              source.type = contentType;
                              
                              newVideo.appendChild(source);
                              videoEl.parentElement.appendChild(newVideo);
                              
                              // Add error handler to the new video too
                              newVideo.onerror = () => {
                                console.error("Alternative video approach also failed");
                                newVideo.style.display = 'none';
                                showErrorMessage();
                              };
                              
                              return; // Exit early if we're trying the alternative
                            } catch (err) {
                              console.error("Error in alternative video approach:", err);
                              // Fall through to standard error display
                            }
                          }
                          
                          showErrorMessage();
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
                  {video.imageUrl?.startsWith('data:image/') ? (
                    <img 
                      src={video.imageUrl} 
                      alt={video.title} 
                      className="max-h-[70vh] object-contain"
                      onError={(e) => {
                        console.error("Error loading image data URL");
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'bg-red-600/20 border border-red-600 rounded-md p-4 text-center';
                          errorDiv.innerHTML = `
                            <h3 class="text-red-400 text-lg font-semibold mb-2">
                              <i class="fas fa-exclamation-circle mr-2"></i>
                              Image Data Failed to Load
                            </h3>
                            <p class="text-gray-300">
                              The image data could not be displayed. It may be corrupted or in an unsupported format.
                            </p>
                          `;
                          e.currentTarget.parentElement.appendChild(errorDiv);
                        }
                      }}
                    />
                  ) : (video.imageUrl?.includes('<!DOCTYPE html>') || 
                     video.imageUrl?.includes('<html') || 
                     video.imageUrl?.startsWith('data:text/html;') ||
                     video.imageUrl?.startsWith('data:text/plain;') ||
                     video.imageUrl?.startsWith('data:application/') ||
                     /^data:text\/(?!image)/.test(video.imageUrl || '')) ? (
                    <div className="text-center p-4">
                      <div className="bg-yellow-600/20 border border-yellow-600 rounded-md p-4 mb-4">
                        <h3 className="text-yellow-400 text-lg font-semibold mb-2">
                          <i className="fas fa-exclamation-triangle mr-2"></i>
                          Document or Text File Detected
                        </h3>
                        <p className="text-gray-300 mb-4">
                          This content appears to be a document, HTML file, or text-based format rather than an image. It cannot be displayed directly in the image viewer.
                        </p>
                        <a 
                          href={video.imageUrl || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded inline-flex items-center"
                        >
                          <i className="fas fa-external-link-alt mr-2"></i>
                          Open Document
                        </a>
                      </div>
                      
                      <div className="mt-4 text-gray-400 text-sm">
                        <p>For best results, please upload image files (JPEG, PNG, GIF, WebP, etc.) rather than text or document files.</p>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={video.thumbnail || video.imageUrl || ''} 
                      alt={video.title} 
                      className="max-h-[70vh] object-contain"
                      onError={(e) => {
                        // If image fails to load, show a fallback message
                        console.error("Error loading image from URL:", video.imageUrl);
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'bg-red-600/20 border border-red-600 rounded-md p-4 text-center';
                          errorDiv.innerHTML = `
                            <h3 class="text-red-400 text-lg font-semibold mb-2">
                              <i class="fas fa-exclamation-circle mr-2"></i>
                              Image Failed to Load
                            </h3>
                            <p class="text-gray-300">
                              The image could not be displayed. It may be in an unsupported format or the URL might be invalid.
                            </p>
                            <div class="mt-4">
                              <a href="${video.imageUrl}" target="_blank" rel="noopener noreferrer" class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded inline-flex items-center mt-2">
                                <i class="fas fa-external-link-alt mr-2"></i>
                                Try Opening Directly
                              </a>
                            </div>
                          `;
                          e.currentTarget.parentElement.appendChild(errorDiv);
                        }
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 flex items-center justify-center text-gray-400 w-full">
                  No media available
                </div>
              )}
            </div>
            
            {/* Info section */}
            <div className="px-6 py-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 id="video-title" className="text-xl font-semibold mb-2 text-white">{video.title}</h2>
                  
                  <div className="flex items-center text-gray-400 text-sm">
                    <span className="flex items-center">
                      <i className="fas fa-eye mr-1"></i>
                      {Math.floor(Math.random() * 10000) + 100} views
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      Added {Math.floor(Math.random() * 15) + 1} days ago
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button className="bg-[#333] hover:bg-[#444] text-white px-3 py-2 rounded flex items-center">
                    <i className="fas fa-thumbs-up mr-2"></i>
                    <span>93%</span>
                  </button>
                  <button className="bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded flex items-center">
                    <i className="fas fa-download mr-2"></i>
                    <span>Download</span>
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex items-center" onClick={handleReport}>
                    <i className="fas fa-flag mr-2"></i>
                    <span>Report</span>
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {video.contentType === 'embed' ? (
                  video.embedCode && isRedditEmbed(video.embedCode) ? (
                    <span className="bg-[#333] text-white text-xs px-2 py-1 rounded">
                      <i className="fab fa-reddit mr-1"></i> Reddit Embed
                    </span>
                  ) : (
                    <span className="bg-[#333] text-white text-xs px-2 py-1 rounded">
                      <i className="fab fa-youtube mr-1"></i> YouTube Embed
                    </span>
                  )
                ) : (
                  <span className="bg-[#333] text-white text-xs px-2 py-1 rounded">
                    <i className="fas fa-robot mr-1"></i> AI Generated
                  </span>
                )}
                
                {video.resolution && (
                  <span className="bg-[#333] text-white text-xs px-2 py-1 rounded">
                    <i className="fas fa-video mr-1"></i> {video.resolution}
                  </span>
                )}
                
                {video.aiGenerator && (
                  <span className="bg-[#333] text-white text-xs px-2 py-1 rounded">
                    <i className="fas fa-magic mr-1"></i> {video.aiGenerator}
                  </span>
                )}
                
                {video.categoryId && (
                  <span className="bg-[#333] text-white text-xs px-2 py-1 rounded">
                    <i className="fas fa-tag mr-1"></i> Category {video.categoryId}
                  </span>
                )}
              </div>
              
              <div className="space-y-4 pt-4 border-t border-gray-800">
                {video.prompt && (
                  <div className="mb-4">
                    <h3 className="text-white text-sm font-semibold mb-2">
                      <i className="fas fa-comment-alt mr-2"></i> AI PROMPT
                    </h3>
                    <div className="bg-[#111] p-3 rounded text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                      {video.prompt}
                    </div>
                  </div>
                )}
                
                {video.description && (
                  <div className="mb-4">
                    <h3 className="text-white text-sm font-semibold mb-2">
                      <i className="fas fa-info-circle mr-2"></i> DESCRIPTION
                    </h3>
                    <div className="bg-[#111] p-3 rounded text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                      {video.description}
                    </div>
                  </div>
                )}
                
                <div className="mt-6">
                  <h3 className="text-white text-sm font-semibold mb-3">
                    <i className="fas fa-comments mr-2"></i> COMMENTS
                  </h3>
                  
                  {/* Comment form */}
                  <div className="mb-4 bg-[#111] p-3 rounded">
                    <textarea 
                      className="w-full bg-[#222] text-white text-sm p-3 rounded border border-gray-700 focus:border-primary focus:ring-0 outline-none" 
                      rows={3}
                      placeholder="Add a comment..."
                    ></textarea>
                    <div className="flex justify-end mt-2">
                      <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded text-sm">
                        Post Comment
                      </button>
                    </div>
                  </div>
                  
                  {/* Comments list */}
                  <div className="space-y-4">
                    {/* Sample comment */}
                    <div className="flex space-x-3 bg-[#111] p-3 rounded">
                      <div className="shrink-0">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white">
                          <i className="fas fa-user text-sm"></i>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="font-medium text-white text-sm">Anonymous User</span>
                          <span className="mx-2 text-gray-500 text-xs">•</span>
                          <span className="text-gray-500 text-xs">2 days ago</span>
                        </div>
                        <p className="text-gray-300 text-sm">This is amazing! The AI generation quality is incredible. Would love to know more about the prompt used.</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3 bg-[#111] p-3 rounded">
                      <div className="shrink-0">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white">
                          <i className="fas fa-user text-sm"></i>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="font-medium text-white text-sm">AI Enthusiast</span>
                          <span className="mx-2 text-gray-500 text-xs">•</span>
                          <span className="text-gray-500 text-xs">5 days ago</span>
                        </div>
                        <p className="text-gray-300 text-sm">Very cool content. How long did this take to generate? I'm experimenting with similar techniques.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}