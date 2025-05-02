import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import GenericVideoEmbed from './GenericVideoEmbed';
import AIWatermark from './AIWatermark';
import { Video } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, ThumbsUp, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EmergencyVideoPlayer from './EmergencyVideoPlayer';
import S3VideoPlayer from './S3VideoPlayer';
import S3ImageComponent from './S3ImageComponent';
import { 
  isRedditEmbed,
  extractRedditInfo,
  fetchS3Url
} from '@/lib/utils';
import {
  extractYoutubeVideoId,
  extractYoutubeIdFromEmbed,
  youtubeUrlToEmbedCode
} from '@/lib/youtubeUtils';

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
  const [uploaderUsername, setUploaderUsername] = useState<string>("");
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
        
        // Fetch uploader username if video has a userId
        if (data.userId) {
          try {
            const response = await apiRequest('GET', `/api/users/${data.userId}/profile`);
            const userData = await response.json();
            if (userData && userData.username) {
              setUploaderUsername(userData.username);
            }
          } catch (error) {
            console.error('Error fetching uploader username:', error);
          }
        }
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
      hasYoutube: video.embedCode ? video.embedCode.includes('youtube.com') : false,
      embedLength: video.embedCode.length
    });
    
    // Reference to prevent race conditions
    const containerRef = embedContainerRef.current;
    if (!containerRef) return;
    
    // Clear previous content
    containerRef.innerHTML = '';
    
    // Check if it's a YouTube embed - Enhanced detection with more URL formats
    const hasYouTube = video.embedCode.includes('youtube.com/embed/') || 
                      video.embedCode.includes('youtu.be/') || 
                      video.embedCode.includes('youtube.com/watch') ||
                      video.embedCode.includes('youtube.com/shorts/') ||
                      video.embedCode.includes('youtube.com/v/');
    
    // Always prioritize fixing YouTube embeds
    if (hasYouTube) {
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
        
        // Use our centralized function to generate a consistent embed
        const embedCode = youtubeUrlToEmbedCode(`https://www.youtube.com/watch?v=${youtubeId}`, true);
        if (embedCode) {
          containerRef.innerHTML = embedCode;
        } else {
          // Fallback to direct approach if the function fails
          containerRef.innerHTML = `
            <iframe 
              src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&origin=${window.location.origin}" 
              width="100%" 
              height="100%" 
              style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:4px;" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen 
              frameborder="0"
              loading="lazy"
              title="${video.title || 'YouTube video'}"
            ></iframe>
          `;
        }
        
        // Add an event listener to detect when the YouTube API is loaded
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
        
        // Log when YouTube iframe is loaded
        console.log('YouTube embed loaded for video ID:', youtubeId);
        
        // Add a fallback message if the iframe doesn't work
        setTimeout(() => {
          // Check if the iframe is still empty or not working
          const iframe = containerRef.querySelector('iframe');
          if (!iframe || !iframe.contentWindow) {
            console.warn('YouTube embed iframe is not loading properly, adding direct link');
            containerRef.innerHTML += `
              <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);color:white;text-align:center;padding:20px;">
                <div>
                  <p style="margin-bottom:15px;">YouTube video could not be embedded due to browser restrictions.</p>
                  <a href="https://www.youtube.com/watch?v=${youtubeId}" target="_blank" rel="noopener noreferrer" 
                    style="display:inline-block;background:#cc0000;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;font-weight:bold;">
                    Watch on YouTube
                  </a>
                </div>
              </div>
            `;
          }
        }, 3000); // Wait 3 seconds to check if iframe loaded
      } else {
        // Fallback: use the server-provided embed code
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

  // Define window with webkitAudioContext for TypeScript
  interface WindowWithWebkitAudio extends Window {
    webkitAudioContext: typeof AudioContext;
  }
  
  // Define extended video element with added properties
  interface ExtendedHTMLVideoElement extends HTMLVideoElement {
    _audioContext?: AudioContext;
    _mediaSource?: MediaElementAudioSourceNode;
    _gainNode?: GainNode;
  }

  // Interface for container element with cleanup function
  interface ExtendedHTMLElement extends HTMLElement {
    _cleanup?: () => void;
  }

  // Effect to cleanup video elements when dialog closes
  useEffect(() => {
    // Only setup cleanup when the player is open
    if (!isOpen) return;
    
    // Return cleanup function that runs when component unmounts or dependencies change
    return () => {
      console.log('VideoPlayer: EMERGENCY SHUTDOWN OF ALL MEDIA');
      
      try {
        // Find all video containers with custom cleanup
        const containers = document.querySelectorAll('.video-player-container');
        containers.forEach(container => {
          const extendedContainer = container as ExtendedHTMLElement;
          if (extendedContainer._cleanup && typeof extendedContainer._cleanup === 'function') {
            try {
              extendedContainer._cleanup();
              console.log('Called custom cleanup handler on container');
            } catch (err) {
              console.error('Error in custom cleanup:', err);
            }
          }
        });
        
        // Close all audio contexts in the document
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          const extendedVideo = video as ExtendedHTMLVideoElement;
          if (extendedVideo._audioContext) {
            try {
              if (extendedVideo._gainNode) {
                extendedVideo._gainNode.disconnect();
              }
              if (extendedVideo._mediaSource) {
                extendedVideo._mediaSource.disconnect();
              }
              if (extendedVideo._audioContext && extendedVideo._audioContext.state !== 'closed') {
                extendedVideo._audioContext.close();
                console.log('Closed audio context from video element');
              }
            } catch (e) {
              console.error('Error closing audio context:', e);
            }
          }
          
          // Basic video cleanup
          try {
            video.pause();
            video.muted = true;
            video.volume = 0;
            if (video.hasAttribute('src')) video.removeAttribute('src');
            video.load();
          } catch (e) {
            console.error('Error in basic video cleanup:', e);
          }
        });
        
        // Also clean up audio elements
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
          try {
            audio.pause();
            audio.muted = true;
            audio.volume = 0;
            if (audio.hasAttribute('src')) audio.removeAttribute('src');
            audio.load();
          } catch (e) {
            console.error('Error cleaning up audio element:', e);
          }
        });
        
        // Clear iframes that could contain media
        document.querySelectorAll('iframe').forEach(iframe => {
          if (iframe.parentNode && iframe.src && (
            iframe.src.includes('youtube') || 
            iframe.src.includes('vimeo') || 
            iframe.src.includes('video') || 
            iframe.src.includes('audio') ||
            iframe.src.includes('embed')
          )) {
            iframe.parentNode.removeChild(iframe);
            console.log('Removed iframe with possible media content');
          }
        });
      } catch (finalError) {
        console.error('Global media shutdown failed:', finalError);
      }
    };
  }, [isOpen]);

  // Create completely isolated MP4 player with dedicated cleanup mechanisms
  const renderMP4Player = () => {
    if (!video || !video.videoUrl) return null;
    
    // Create a unique ID for this video instance
    const videoInstanceId = `video-${videoId}-${new Date().getTime()}`;
    
    // Reference to the audio context (browser audio API)
    let audioCtx: AudioContext | null = null;
    let mediaSource: MediaElementAudioSourceNode | null = null;
    let gainNode: GainNode | null = null;
    
    // Function to completely dispose of audio resources
    const destroyAudioContext = () => {
      try {
        if (gainNode) {
          gainNode.disconnect();
          gainNode = null;
        }
        if (mediaSource) {
          mediaSource.disconnect();
          mediaSource = null;
        }
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close();
          audioCtx = null;
          console.log('🔇 Audio context fully closed');
        }
      } catch (e) {
        console.error('Error destroying audio context:', e);
      }
    };
    
    return (
      <div className="relative w-full h-full">
        {/* Create a completely isolated video player */}
        <div 
          id={videoInstanceId}
          className="w-full h-full video-player-container" 
          ref={el => {
            if (!el || !video?.videoUrl) return;
            
            // Clear previous content
            el.innerHTML = '';
            
            // Create video element with unique ID and isolation attributes
            const videoEl = document.createElement('video');
            videoEl.id = `video-element-${videoInstanceId}`;
            videoEl.controls = true;
            videoEl.autoplay = false; // Start muted and then unmute later
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.className = 'w-full h-full isolated-video-player';
            videoEl.crossOrigin = 'anonymous'; // For audio context
            
            // Set URL with cache-busting parameter
            const cacheBuster = `cb=${new Date().getTime()}`;
            const urlSeparator = video.videoUrl.includes('?') ? '&' : '?';
            if (video.videoUrl) {
              videoEl.src = `${video.videoUrl}${urlSeparator}${cacheBuster}`;
            }
            
            if (video.thumbnail) {
              videoEl.poster = video.thumbnail;
            }
            
            // Store reference
            videoRef.current = videoEl;
            
            // LOG LIFECYCLE EVENTS
            videoEl.addEventListener('loadstart', () => console.log('🎬 MP4 video: loadstart'));
            videoEl.addEventListener('loadedmetadata', () => {
              console.log('📋 MP4 video: loadedmetadata');
              // Create audio context after metadata is loaded
              try {
                // Create new audio context for isolated audio control
                audioCtx = new (window.AudioContext || (window as unknown as WindowWithWebkitAudio).webkitAudioContext)();
                mediaSource = audioCtx.createMediaElementSource(videoEl);
                gainNode = audioCtx.createGain();
                mediaSource.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                console.log('🔊 Created dedicated audio context for better control');
                
                // Store references to audio elements for cleanup using type assertion
                (videoEl as ExtendedHTMLVideoElement)._audioContext = audioCtx;
                (videoEl as ExtendedHTMLVideoElement)._mediaSource = mediaSource;
                (videoEl as ExtendedHTMLVideoElement)._gainNode = gainNode;
              } catch (e) {
                console.error('Error creating audio context:', e);
              }
            });
            
            videoEl.addEventListener('canplay', () => {
              console.log('▶️ MP4 video: canplay');
              // Start playing but keep muted initially
              videoEl.play()
                .then(() => {
                  // Unmute after successfully starting playback
                  setTimeout(() => {
                    if (isOpen) {
                      videoEl.muted = false;
                      if (gainNode) gainNode.gain.value = 1.0;
                      console.log('🔊 Unmuted video after successful play');
                    }
                  }, 500);
                })
                .catch(e => console.warn('⚠️ Autoplay prevented:', e));
            });
            
            // Handle errors
            videoEl.addEventListener('error', (e) => {
              console.error('❌ MP4 video error:', e);
              if (videoEl.error) {
                console.error('Error code:', videoEl.error.code, 'Message:', videoEl.error.message);
              }
              
              // Hide the video element
              videoEl.style.display = 'none';
              
              // Clean up audio resources
              destroyAudioContext();
              
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
            
            // Handle cleanup when video ends
            videoEl.addEventListener('ended', () => {
              console.log('🏁 Video playback ended normally');
              destroyAudioContext();
            });
            
            // Special lifecycle handlers for this component
            (el as unknown as ExtendedHTMLElement)._cleanup = () => {
              console.log('🧹 Running specialized video cleanup');
              if (videoEl) {
                // Stop video playback
                videoEl.pause();
                videoEl.muted = true;
                if (gainNode) gainNode.gain.value = 0;
                
                // Remove source
                videoEl.removeAttribute('src');
                videoEl.load();
                
                // Destroy audio context
                destroyAudioContext();
                
                // Finally remove from DOM
                if (videoEl.parentNode) {
                  videoEl.parentNode.removeChild(videoEl);
                }
              }
            };
            
            // Add video to container
            el.appendChild(videoEl);
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
    console.log('VideoPlayer: EMERGENCY SHUTDOWN OF ALL MEDIA');
    
    // This is a multi-step approach to guarantee all media is stopped
    try {
      // STEP 1: Destroy all video containers completely
      const videoContainers = document.querySelectorAll('.video-player-container');
      videoContainers.forEach(container => {
        if (container instanceof HTMLElement) {
          container.innerHTML = '';
          console.log('Cleared video container');
        }
      });
      
      // STEP 2: Nuclear option - find and completely annihilate all video elements
      document.querySelectorAll('video').forEach(videoEl => {
        try {
          console.log('Destroying video element:', videoEl);
          
          // Method 1: Pause and mute
          videoEl.pause();
          videoEl.muted = true;
          videoEl.volume = 0;
          
          // Method 2: Remove sources
          const sources = videoEl.querySelectorAll('source');
          sources.forEach(source => source.remove());
          videoEl.removeAttribute('src');
          
          // Method 3: Force media element to clear its buffer
          videoEl.load();
          
          // Method 4: Remove event listeners that might restart playback
          const clone = videoEl.cloneNode(false);
          if (videoEl.parentNode) {
            videoEl.parentNode.replaceChild(clone, videoEl);
          }
          
          // Method 5: Force browser garbage collection by removing references
          if (clone.parentNode) {
            clone.parentNode.removeChild(clone);
          }
          
          console.log('Video element completely destroyed');
        } catch (e) {
          console.error('Error destroying video:', e);
          // Final fallback - crude DOM manipulation to kill it
          try {
            if (videoEl.parentNode) {
              videoEl.parentNode.removeChild(videoEl);
            }
          } catch (e2) {
            console.error('Ultimate fallback failed:', e2);
          }
        }
      });
      
      // STEP 3: Also clear any audio elements that might be playing
      document.querySelectorAll('audio').forEach(audioEl => {
        try {
          audioEl.pause();
          audioEl.muted = true;
          audioEl.volume = 0;
          audioEl.removeAttribute('src');
          audioEl.load();
          
          if (audioEl.parentNode) {
            audioEl.parentNode.removeChild(audioEl);
          }
        } catch (e) {
          console.error('Error stopping audio:', e);
        }
      });
      
      // STEP 4: Clear all iframes that might contain audio/video
      if (embedContainerRef.current) {
        embedContainerRef.current.innerHTML = '';
      }
      
      // STEP 5: Remove all other potential iframe sources
      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          // Don't touch UI iframes, just media ones
          if (iframe.src && (
              iframe.src.includes('youtube.com') || 
              iframe.src.includes('vimeo.com') || 
              iframe.src.includes('reddit.com') ||
              iframe.src.includes('video')))
          {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }
        } catch (e) {
          console.error('Error removing iframe:', e);
        }
      });
      
      // STEP 6: Nullify all references
      videoRef.current = null;
      
    } catch (e) {
      console.error('Error in emergency media shutdown:', e);
    } finally {
      // Always call the original onClose, even if cleanup fails
      onClose();
    }
  };
  
  // Create a basic, direct modal implementation instead of using the Dialog component
  console.log('VideoPlayer render with isOpen:', isOpen, 'videoId:', videoId);
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleCloseDialog}>
      <div 
        className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw] bg-[#1a1a1a] border border-gray-800 rounded-lg relative" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={handleCloseDialog}
            className="bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
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
                  <GenericVideoEmbed
                    videoUrl={`https://vimeo.com/${video.vimeoId}`}
                    title={video.title}
                    autoplay={true}
                    loop={false}
                    responsive={true}
                    showTitle={false}
                    showByline={false}
                    showPortrait={false}
                  />
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
                  
                  {/* Use the specialized S3VideoPlayer component for S3 URLs */}
                  {video.videoUrl.startsWith('/api/s3/') ? (
                    <div className="w-full h-full">
                      <S3VideoPlayer
                        videoUrl={video.videoUrl}
                        title={video.title}
                        autoPlay={true}
                        loop={false}
                        className="w-full h-full"
                        onError={(e) => console.error(`Error playing S3 video:`, e)}
                      />
                    </div>
                  ) : video.videoUrl.includes('.mp4') || video.videoUrl.includes('video/mp4') || video.videoUrl.startsWith('/uploads/') ? (
                    <div className="w-full h-full">
                      <EmergencyVideoPlayer
                        src={video.videoUrl}
                        poster={video.thumbnail || undefined}
                        onEnded={() => console.log('Video playback completed')}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    // For other video types, use the src attribute directly
                    <div className="video-player-container w-full h-full">
                      <video 
                        controls 
                        autoPlay 
                        className="w-full h-full video-player" 
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
                    </div>
                  )}
                </div>
              ) : video.contentType === 'image' ? (
                <div className="flex flex-col items-center justify-center bg-black p-4 max-h-[70vh] overflow-auto relative">
                  {/* Add AI watermark for all images */}
                  <AIWatermark position="bottom-right" size="medium" />
                  
                  {/* Check for data URLs which are usually properly formatted images */}
                  {video.imageUrl ? (
                    video.imageUrl.startsWith('/api/s3/') ? (
                      <S3ImageComponent 
                        imageUrl={video.imageUrl} 
                        alt={video.title}
                        className="max-h-[70vh] object-contain"
                      />
                    ) : (
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
                    )
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
                      {uploaderUsername && (
                        <>
                          <span className="text-gray-500 mx-2">•</span>
                          <Link 
                            to={`/user/${uploaderUsername}`} 
                            className="text-orange-500 hover:text-orange-400 hover:underline"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            {uploaderUsername}
                          </Link>
                        </>
                      )}
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
      </div>
    </div>
  );
}