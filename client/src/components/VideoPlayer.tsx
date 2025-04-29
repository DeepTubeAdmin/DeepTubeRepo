import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import VimeoEmbed from './VimeoEmbed';
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
  
  // This effect loads the video data
  useEffect(() => {
    console.log("VideoPlayer: Effect triggered with videoId:", videoId, "isOpen:", isOpen);
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
        console.log("VideoPlayer: Received video data:", data);
        
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
      <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw] bg-black border-gray-800 p-0">
        <DialogTitle className="sr-only" id="video-player-title">
          {video?.title || "Video Player"}
        </DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center py-16" aria-live="polite">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="Loading video" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500" aria-live="assertive">
            <p>{error}</p>
          </div>
        ) : video ? (
          <div>
            {/* Media section */}
            <div className="bg-black">
              {video.vimeoId ? (
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
              ) : video.contentType === 'embed' && video.embedCode ? (
                <div className="aspect-video w-full">
                  <div 
                    className="w-full h-full relative embed-container"
                    style={{ paddingBottom: '56.25%' }}
                  >
                    {/* Dynamically created iframe will be inserted here */}
                    <div 
                      ref={embedContainerRef}
                      className="absolute inset-0"
                    />
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
              ) : video.contentType === 'image' ? (
                <div className="flex justify-center bg-black p-4">
                  <img 
                    src={video.thumbnail || video.imageUrl || ''} 
                    alt={video.title} 
                    className="max-h-[70vh] object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 flex items-center justify-center text-gray-400 h-[70vh]">
                  No media available
                </div>
              )}
            </div>
            
            {/* Info section */}
            <div className="px-6 py-5 border-t border-gray-800">
              <h2 id="video-title" className="text-xl font-bold mb-2 text-white">{video.title}</h2>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-gray-400 text-sm">
                  {Math.floor(Math.random() * 10000) + 100} views
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400 text-sm">
                  Added {Math.floor(Math.random() * 15) + 1} days ago
                </span>
                
                {video.categoryId && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-primary hover:text-primary/80 text-sm cursor-pointer">
                      Category {video.categoryId}
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {video.contentType === 'embed' ? (
                  video.embedCode && isRedditEmbed(video.embedCode) ? (
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                      Reddit Embed
                    </span>
                  ) : (
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                      YouTube Embed
                    </span>
                  )
                ) : (
                  <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                    AI Generated
                  </span>
                )}
                
                {video.resolution && (
                  <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                    {video.resolution}
                  </span>
                )}
                
                {video.aiGenerator && (
                  <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                    {video.aiGenerator}
                  </span>
                )}
              </div>
              
              <div className="space-y-4 pt-4 border-t border-gray-800">
                {video.prompt && (
                  <div className="mb-4">
                    <h3 className="text-white text-sm font-semibold uppercase mb-2">AI Prompt</h3>
                    <p className="text-sm leading-relaxed text-gray-400 whitespace-pre-wrap">{video.prompt}</p>
                  </div>
                )}
                
                {video.description && (
                  <div className="mb-4">
                    <h3 className="text-white text-sm font-semibold uppercase mb-2">Description</h3>
                    <p className="text-sm leading-relaxed text-gray-400 whitespace-pre-wrap">{video.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}