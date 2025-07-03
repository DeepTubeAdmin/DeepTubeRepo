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
        console.log("VideoPlaybackContext: Global video play event detected");
        
        // If this is not the current playing video, either pause it or make it current
        if (currentPlayingVideo.current !== video) {
          // Check if we should allow this video to play
          const otherVideosPlaying = Array.from(document.querySelectorAll('video')).some(
            v => v !== video && !v.paused
          );
          
          if (otherVideosPlaying || currentPlayingVideo.current) {
            console.log("VideoPlaybackContext: Pausing unauthorized video");
            video.pause();
          } else {
            console.log("VideoPlaybackContext: Allowing video to become current");
            currentPlayingVideo.current = video;
          }
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
    
    // ALWAYS pause all other videos first with more aggressive approach
    if (video !== null) {
      // Pause ALL videos except the new one
      document.querySelectorAll('video').forEach(videoElement => {
        if (videoElement !== video && !videoElement.paused) {
          try {
            videoElement.pause();
            
            // Additional iOS-specific pause enforcement
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
              // Force pause on iOS with a small delay
              setTimeout(() => {
                if (videoElement !== video && !videoElement.paused) {
                  videoElement.pause();
                  console.log("VideoPlaybackContext: Force paused other video on iOS during switch");
                }
              }, 50);
            }
            
            console.log("VideoPlaybackContext: Paused other video during switch");
          } catch (error) {
            console.log("Error pausing other video:", error);
          }
        }
      });
    }
    
    // Update the current playing video reference
    currentPlayingVideo.current = video;
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
