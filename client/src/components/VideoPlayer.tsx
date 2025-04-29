import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import VimeoEmbed from './VimeoEmbed';
import { Video } from '@/types';
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
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  
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
    
    // Clear previous content
    if (youtubeContainerRef.current) {
      youtubeContainerRef.current.innerHTML = '';
    }
    
    // Handle YouTube embeds
    const ytSrcRegex = /src="https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})(?:\?.*)?"/;
    const ytMatch = video.embedCode.match(ytSrcRegex);
    const youtubeId = ytMatch ? ytMatch[1] : null;
    
    if (youtubeId) {
      console.log("VideoPlayer: Creating YouTube iframe for video ID:", youtubeId);
      
      if (youtubeContainerRef.current) {      
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0`;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.title = video.title || 'YouTube video';
        iframe.frameBorder = '0';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.borderRadius = '4px';
        
        youtubeContainerRef.current.appendChild(iframe);
      }
    } 
    // Handle Reddit embeds
    else if (isRedditEmbed(video.embedCode)) {
      console.log("VideoPlayer: Creating Reddit embed from code");
      
      if (youtubeContainerRef.current) {
        // Clear the container first
        youtubeContainerRef.current.innerHTML = '';
        
        // Extract Reddit information from the embed code
        let subreddit = null;
        let postId = null;
        
        // First try using the extractRedditInfo utility
        const info = extractRedditInfo(video.embedCode);
        subreddit = info.subreddit;
        postId = info.postId;
        
        // If that didn't work, try looking for an iframe src in the embed code
        if (!subreddit || !postId) {
          const iframeSrcRegex = /src="https:\/\/www\.reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)\/embed\/"/;
          const iframeMatch = video.embedCode.match(iframeSrcRegex);
          if (iframeMatch) {
            subreddit = iframeMatch[1];
            postId = iframeMatch[2];
            console.log("VideoPlayer: Extracted Reddit info from iframe src:", subreddit, postId);
          }
        }
        
        // Try one more extraction method from URL patterns in the embed code
        if (!subreddit || !postId) {
          const urlPattern = /reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)/;
          const match = video.embedCode.match(urlPattern);
          if (match) {
            subreddit = match[1];
            postId = match[2];
            console.log("VideoPlayer: Extracted Reddit info from URL pattern:", subreddit, postId);
          }
        }
        
        // If we have the Reddit information, create a direct iframe
        if (subreddit && postId) {
          // Create iframe for Reddit embed
          const postUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}/embed/`;
          console.log("VideoPlayer: Creating direct Reddit iframe with URL:", postUrl);
          
          const iframe = document.createElement('iframe');
          iframe.src = postUrl;
          iframe.width = '100%';
          iframe.height = '100%';
          iframe.style.border = 'none';
          iframe.style.position = 'absolute';
          iframe.style.top = '0';
          iframe.style.left = '0';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.allowFullscreen = true;
          iframe.title = video.title || 'Reddit Post';
          iframe.scrolling = 'no';
          
          // Add sandbox attribute to allow scripts but enhance security
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
          
          // Create a container for the iframe
          const iframeContainer = document.createElement('div');
          iframeContainer.style.position = 'relative';
          iframeContainer.style.width = '100%';
          iframeContainer.style.height = '100%';
          iframeContainer.appendChild(iframe);
          
          youtubeContainerRef.current.appendChild(iframeContainer);
          
          // Add a link to view on Reddit as fallback
          const fallbackLink = document.createElement('div');
          fallbackLink.style.position = 'absolute';
          fallbackLink.style.bottom = '15px';
          fallbackLink.style.right = '15px';
          fallbackLink.style.background = 'rgba(0,0,0,0.7)';
          fallbackLink.style.color = 'white';
          fallbackLink.style.padding = '8px 12px';
          fallbackLink.style.borderRadius = '4px';
          fallbackLink.style.fontSize = '14px';
          fallbackLink.style.cursor = 'pointer';
          fallbackLink.style.zIndex = '10';
          fallbackLink.textContent = 'View on Reddit';
          fallbackLink.onclick = () => window.open(`https://www.reddit.com/r/${subreddit}/comments/${postId}/`, '_blank');
          
          youtubeContainerRef.current.appendChild(fallbackLink);
        } else {
          // Fallback to using the provided embed code
          console.log("VideoPlayer: Falling back to provided embed code");
          youtubeContainerRef.current.innerHTML = video.embedCode;
          
          // Force load the Reddit script
          const script = document.createElement('script');
          script.src = 'https://embed.reddit.com/widgets.js';
          script.async = true;
          script.charset = 'UTF-8';
          youtubeContainerRef.current.appendChild(script);
        }
      }
    }
    // Generic embed code (for other platforms)
    else if (youtubeContainerRef.current) {
      // Just insert the embed code as-is for other platforms
      youtubeContainerRef.current.innerHTML = video.embedCode;
    }
  }, [isOpen, video]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw]">
        <DialogTitle className="sr-only" id="video-player-title">
          {video?.title || "Video Player"}
        </DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center py-12" aria-live="polite">
            <Loader2 className="h-10 w-10 animate-spin text-border" aria-label="Loading video" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive" aria-live="assertive">
            <p>{error}</p>
          </div>
        ) : video ? (
          <div className="space-y-4">
            <div className="rounded-md overflow-hidden">
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
                    {/* Dynamically created YouTube iframe will be inserted here */}
                    <div 
                      ref={youtubeContainerRef}
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
                        border-radius: 4px;
                      }
                    `}} />
                  </div>
                </div>
              ) : video.contentType === 'image' ? (
                <div className="flex justify-center bg-black/10 py-4">
                  <img 
                    src={video.thumbnail || video.imageUrl} 
                    alt={video.title} 
                    className="max-h-[70vh] object-contain rounded-md shadow-lg"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center text-muted-foreground h-[70vh]">
                  No media available
                </div>
              )}
            </div>
            
            <div className="px-6 py-5">
              <DialogTitle id="video-title" className="text-2xl font-bold mb-4">{video.title}</DialogTitle>
              
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full">
                  {video.resolution}
                </span>
                
                {video.category && (
                  <span className="bg-secondary text-primary text-sm px-3 py-1 rounded-full flex items-center">
                    <span className="mr-1">Category:</span>
                    {video.category.name}
                  </span>
                )}
                
                {video.contentType === 'embed' ? (
                  video.embedCode && isRedditEmbed(video.embedCode) ? (
                    <span className="text-sm text-muted-foreground bg-orange-50 text-orange-700 px-3 py-1 rounded-full">
                      Reddit Embed
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full">
                      YouTube Embed
                    </span>
                  )
                ) : (
                  <span className="text-sm text-muted-foreground bg-primary/5 px-3 py-1 rounded-full">
                    AI Generated
                  </span>
                )}
                
                {video.aiGenerator && (
                  <span className="text-sm text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full">
                    {video.aiGenerator}
                  </span>
                )}
              </div>
              
              <div id="video-details" className="space-y-6">
                {video.prompt && (
                  <div className="mt-5 p-4 bg-muted/30 rounded-lg border border-muted">
                    <h3 className="text-base font-semibold mb-3">AI Prompt</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{video.prompt}</p>
                  </div>
                )}
                
                {video.description && (
                  <div className="mt-5 p-4 bg-muted/30 rounded-lg border border-muted">
                    <h3 className="text-base font-semibold mb-3">Description</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{video.description}</p>
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