import React, { createContext, useContext, useRef, useCallback, useState } from 'react';

interface VideoPlaybackContextType {
  currentPlayingVideo: React.MutableRefObject<HTMLVideoElement | null>;
  setCurrentPlayingVideo: (video: HTMLVideoElement | null) => void;
  pauseAllVideos: () => void;
  isVideoAllowedToPlay: (video: HTMLVideoElement) => boolean;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextType | undefined>(undefined);

export const VideoPlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentPlayingVideo = useRef<HTMLVideoElement | null>(null);
  const [, forceUpdate] = useState({});

  // Global event listener to catch any video that starts playing
  React.useEffect(() => {
    const handleVideoPlay = (event: Event) => {
      const video = event.target as HTMLVideoElement;
      if (video && video.tagName === 'VIDEO') {
        console.log("VideoPlaybackContext: Global video play event detected for video");
        
        // If this is not the current playing video, check if we should allow it
        if (currentPlayingVideo.current !== video) {
          // Check if there are other videos currently playing (excluding this one)
          const otherVideosPlaying = Array.from(document.querySelectorAll('video')).some(
            v => v !== video && !v.paused
          );
          
          // Only pause if there are other videos playing AND we have a current video set
          // This allows the first video to play normally and subsequent videos to replace previous ones
          if (otherVideosPlaying) {
            console.log("VideoPlaybackContext: Pausing unauthorized video - other videos are playing");
            video.pause();
          } else {
            // Allow this video to become the current video if no others are playing
            console.log("VideoPlaybackContext: Allowing video to become current - no other videos playing");
            currentPlayingVideo.current = video;
          }
        } else {
          console.log("VideoPlaybackContext: Video is already the current playing video");
        }
      }
    };

    // Listen to all video play events in the document
    document.addEventListener('play', handleVideoPlay, true);
    
    return () => {
      document.removeEventListener('play', handleVideoPlay, true);
    };
  }, []);

  const pauseAllVideos = useCallback(() => {
    console.log("VideoPlaybackContext: Pausing all videos");
    
    // Find and pause ALL video elements with more aggressive approach
    document.querySelectorAll('video').forEach(video => {
      if (!video.paused) {
        try {
          video.pause();
          
          // For iOS devices, also force the video to pause by setting current time
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            // Small delay to ensure pause takes effect on iOS
            setTimeout(() => {
              if (!video.paused) {
                video.pause();
                console.log("VideoPlaybackContext: Force paused video on iOS");
              }
            }, 50);
          }
          
          console.log("VideoPlaybackContext: Paused video element");
        } catch (error) {
          console.log("Error pausing video element:", error);
        }
      }
    });
    
    currentPlayingVideo.current = null;
    forceUpdate({}); // Force re-render to update any dependent components
  }, []);

  const setCurrentPlayingVideo = useCallback((video: HTMLVideoElement | null) => {
    console.log("VideoPlaybackContext: Setting current playing video", video ? "new video" : "null");
    
    // Store the previous video reference
    const previousVideo = currentPlayingVideo.current;
    
    // Update the current playing video reference first
    currentPlayingVideo.current = video;
    
    // If we're setting a new video (not clearing), pause all others
    if (video !== null) {
      // Pause ALL videos except the new one with improved mobile handling
      document.querySelectorAll('video').forEach(videoElement => {
        if (videoElement !== video && !videoElement.paused) {
          try {
            videoElement.pause();
            
            // Enhanced mobile/iOS handling with immediate and delayed pause attempts
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            if (isMobile || isIOS) {
              // Immediate additional pause attempt for mobile
              setTimeout(() => {
                if (videoElement !== video && !videoElement.paused) {
                  videoElement.pause();
                  console.log("VideoPlaybackContext: Force paused other video on mobile during switch");
                }
              }, 10);
              
              // Secondary pause attempt for stubborn mobile browsers
              setTimeout(() => {
                if (videoElement !== video && !videoElement.paused) {
                  videoElement.pause();
                  videoElement.currentTime = videoElement.currentTime; // Force a state refresh
                  console.log("VideoPlaybackContext: Secondary force pause on mobile");
                }
              }, 100);
            }
            
            console.log("VideoPlaybackContext: Paused other video during switch");
          } catch (error) {
            console.log("Error pausing other video:", error);
          }
        }
      });
    } else {
      // If we're clearing the current video (setting to null), make sure the previous video is paused
      if (previousVideo && !previousVideo.paused) {
        try {
          previousVideo.pause();
          console.log("VideoPlaybackContext: Paused previous video when clearing current");
        } catch (error) {
          console.log("Error pausing previous video:", error);
        }
      }
    }
    
    forceUpdate({}); // Force re-render
  }, []);

  const isVideoAllowedToPlay = useCallback((video: HTMLVideoElement) => {
    // A video is allowed to play if there's no current video or if it IS the current video
    const allowed = currentPlayingVideo.current === null || currentPlayingVideo.current === video;
    console.log("VideoPlaybackContext: Video allowed to play?", allowed);
    return allowed;
  }, []);

  return (
    <VideoPlaybackContext.Provider value={{
      currentPlayingVideo,
      setCurrentPlayingVideo,
      pauseAllVideos,
      isVideoAllowedToPlay
    }}>
      {children}
    </VideoPlaybackContext.Provider>
  );
};

export const useVideoPlayback = () => {
  const context = useContext(VideoPlaybackContext);
  if (context === undefined) {
    throw new Error('useVideoPlayback must be used within a VideoPlaybackProvider');
  }
  return context;
};
