import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';

interface EmergencyVideoPlayerProps {
  src: string;
  poster?: string;
  onEnded?: () => void;
  className?: string;
}

/**
 * This is a completely custom video player designed to solve the persistent audio issue
 * by using manual audio controls and emergency shutdown mechanisms.
 */
const EmergencyVideoPlayer: React.FC<EmergencyVideoPlayerProps> = ({ 
  src, 
  poster, 
  onEnded,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize player
  useEffect(() => {
    console.log('🎮 Emergency Video Player: Initializing');
    
    // Setup the audio context
    try {
      if (!audioContextRef.current) {
        // @ts-ignore - For cross-browser support
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
    } catch (e) {
      console.error('Failed to create audio context:', e);
      setError('Audio system initialization failed');
    }
    
    return () => {
      console.log('🎮 Emergency Video Player: Cleanup on unmount');
      destroyEverything();
    };
  }, []);
  
  // Handle source changes
  useEffect(() => {
    if (!src) return;
    
    setIsLoading(true);
    setError(null);
    
    console.log(`🎮 Emergency Video Player: Loading source: ${src.substring(0, 50)}...`);
    
    // Create a timeout to detect loading failures
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        setError('Video failed to load in a reasonable time');
        setIsLoading(false);
      }
    }, 20000);
    
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [src]);
  
  // Complete audio system destruction
  const destroyEverything = () => {
    try {
      console.log('💣 EMERGENCY PLAYER: Complete system destruction');
      
      // First, disconnect and nullify the audio routing
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      
      // Close the audio context to release all audio resources
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error('Error closing audio context:', e));
        audioContextRef.current = null;
      }
      
      // Destroy the video element
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Stop playback
        try {
          video.pause();
          video.currentTime = 0;
          video.muted = true;
          video.volume = 0;
          video.autoplay = false;
          video.src = '';
          video.removeAttribute('src');
          video.load();
        } catch (e) {
          console.error('Error resetting video element:', e);
        }
        
        // Remove all event listeners by cloning and replacing
        if (video.parentNode) {
          const clone = document.createElement('div');
          video.parentNode.replaceChild(clone, video);
        }
        
        // Clear the reference
        videoRef.current = null;
      }
      
      console.log('🧹 EMERGENCY PLAYER: Destruction complete');
    } catch (e) {
      console.error('Failed during emergency cleanup:', e);
    }
  };
  
  // Set up the video reference
  const videoElementRef = (element: HTMLVideoElement | null) => {
    if (!element) return;
    
    videoRef.current = element;
    
    // Setup event listeners
    element.addEventListener('loadstart', () => console.log('🎮 Video: loadstart'));
    
    element.addEventListener('loadedmetadata', () => {
      console.log('🎮 Video: loadedmetadata');
      setIsLoading(false);
      
      // Setup audio routing with the audio context
      try {
        if (audioContextRef.current && !sourceNodeRef.current) {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(element);
          gainNodeRef.current = audioContextRef.current.createGain();
          sourceNodeRef.current.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioContextRef.current.destination);
          console.log('🔊 Created isolated audio routing');
        }
      } catch (e) {
        console.error('Failed to create audio routing:', e);
      }
    });
    
    element.addEventListener('canplay', () => {
      console.log('🎮 Video: canplay');
      if (!isPlaying) {
        element.play()
          .then(() => {
            setIsPlaying(true);
            console.log('▶️ Video playback started');
          })
          .catch(e => {
            console.error('Failed to start playback:', e);
            setError('Autoplay prevented - please click to play');
          });
      }
    });
    
    element.addEventListener('ended', () => {
      console.log('🎮 Video: ended');
      setIsPlaying(false);
      if (onEnded) onEnded();
    });
    
    element.addEventListener('error', (e) => {
      console.error('🎮 Video error:', e);
      setError('Failed to play video');
      setIsLoading(false);
    });
  };
  
  // Toggle mute status
  const toggleMute = () => {
    if (!videoRef.current || !gainNodeRef.current) return;
    
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    // Use both standard video muting and our audio context for complete control
    videoRef.current.muted = newMuteState;
    
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newMuteState ? 0 : 1;
    }
    
    console.log(`🔊 Video ${newMuteState ? 'muted' : 'unmuted'}`);
  };
  
  // Play/pause toggling
  const togglePlayback = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error('Play failed:', e));
    }
  };
  
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* The actual video element */}
      <video
        ref={videoElementRef}
        className="w-full h-full bg-black"
        src={src}
        poster={poster}
        playsInline
        muted={true} // Start muted for autoplay
        controls={false} // We handle controls ourselves for better isolation
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="bg-red-900/50 p-4 rounded-md text-center">
            <p className="text-white font-medium mb-2">Error playing video</p>
            <p className="text-gray-200 text-sm">{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-primary text-black rounded-md"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      
      {/* Custom controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex justify-between items-center">
          <button
            className="w-12 h-12 flex items-center justify-center bg-gray-800/50 rounded-full text-white hover:bg-gray-700/50 transition-colors"
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <span className="text-xl">⏸️</span>
            ) : (
              <span className="text-xl">▶️</span>
            )}
          </button>
          
          <button
            className="w-12 h-12 flex items-center justify-center bg-gray-800/50 rounded-full text-white hover:bg-gray-700/50 transition-colors"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyVideoPlayer;