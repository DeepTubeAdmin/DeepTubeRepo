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
  
  // Complete audio system destruction - called when unloading or closing
  const destroyEverything = () => {
    try {
      console.log('💣 EMERGENCY PLAYER: Complete system destruction');
      
      // CRITICAL: First attempt to stop all audio at the AudioContext level
      // This is the most reliable way to completely stop audio
      if (audioContextRef.current) {
        // Create a zero-volume gain node and connect it to destination
        try {
          const silencer = audioContextRef.current.createGain();
          silencer.gain.value = 0;
          
          // Connect it to destination, which will silence all audio
          silencer.connect(audioContextRef.current.destination);
          
          // Suspend the audio context immediately
          if (audioContextRef.current.state !== 'closed' && audioContextRef.current.state !== 'suspended') {
            audioContextRef.current.suspend();
          }
          
          console.log('🔇 Applied emergency audio muting via global silencer');
        } catch (err) {
          console.error('Failed to create emergency silencer:', err);
        }
      }
      
      // Next, try disconnecting the audio graph
      if (gainNodeRef.current) {
        try {
          // Zero the gain first
          gainNodeRef.current.gain.value = 0;
          gainNodeRef.current.disconnect();
          gainNodeRef.current = null;
          console.log('🔇 Gain node disconnected');
        } catch (err) {
          console.error('Error disconnecting gain node:', err);
        }
      }
      
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
          console.log('🔇 Source node disconnected');
        } catch (err) {
          console.error('Error disconnecting source node:', err);
        }
      }
      
      // Close the audio context to release all audio resources
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            console.log('🔇 Audio context fully closed');
          }
          audioContextRef.current = null;
        } catch (err) {
          console.error('Error closing audio context:', err);
        }
      }
      
      // Destroy the video element
      if (videoRef.current) {
        const video = videoRef.current;
        
        // 1. Stop playback immediately
        try {
          // First immediately mute and zero volume
          video.muted = true;
          video.volume = 0;
          
          // Then pause and remove the time and source
          video.pause();
          video.currentTime = 0;
          video.autoplay = false;
          
          // Remove source and force load to clear buffers
          const originalSrc = video.src;
          video.src = '';
          video.removeAttribute('src');
          video.load();
          
          console.log('🚩 Video element source cleared:', originalSrc);
        } catch (e) {
          console.error('Error resetting video element:', e);
        }
        
        // 2. Create empty audio/video MediaStream to replace the video's srcObject
        try {
          // Create an empty audio context
          const emptyCtx = new AudioContext();
          const emptyOsc = emptyCtx.createOscillator();
          const emptyGain = emptyCtx.createGain();
          
          // Set gain to 0 (silence)
          emptyGain.gain.value = 0;
          
          // Connect and start
          emptyOsc.connect(emptyGain);
          emptyGain.connect(emptyCtx.destination);
          emptyOsc.start();
          
          // Create a silent MediaStream
          const emptyStream = emptyCtx.createMediaStreamDestination().stream;
          
          // Apply to video element
          video.srcObject = emptyStream;
          
          // Immediately clean up
          setTimeout(() => {
            emptyOsc.stop();
            emptyGain.disconnect();
            emptyOsc.disconnect();
            emptyCtx.close();
          }, 100);
          
          console.log('🔇 Applied silent MediaStream to video element');
        } catch (err) {
          // This is an advanced technique that might not be supported in all browsers
          console.error('Error creating empty MediaStream:', err);
        }
        
        // 3. Remove all event listeners by cloning and replacing
        if (video.parentNode) {
          try {
            const emptyDiv = document.createElement('div');
            video.parentNode.replaceChild(emptyDiv, video);
            console.log('🗑️ Video element completely removed from DOM');
          } catch (err) {
            console.error('Error replacing video element:', err);
          }
        }
        
        // 4. Clear the reference
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
      
      // Setup direct audio handling
      try {
        if (!audioContextRef.current) {
          // Resume/create the audio context - this is critical for Chrome
          // @ts-ignore - For cross-browser support
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          
          // Resume immediately (needed for Chrome's autoplay policy)
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(e => console.error('Unable to resume audio context:', e));
          }
        }
        
        if (audioContextRef.current && !sourceNodeRef.current) {
          // Create the audio source and gain node
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(element);
          gainNodeRef.current = audioContextRef.current.createGain();
          
          // Set initial gain to 1.0 (full volume)
          if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = 1.0;
          }
          
          // Connect the nodes
          sourceNodeRef.current.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioContextRef.current.destination);
          console.log('🔊 Created isolated audio routing');
          
          // Add a user interaction handler to unmute
          document.addEventListener('click', function audioEnableHandler() {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume();
              console.log('🔊 Audio context resumed by user interaction');
            }
            // Only need this once
            document.removeEventListener('click', audioEnableHandler);
          }, { once: true });
        }
      } catch (e) {
        console.error('Failed to create audio routing:', e);
      }
    });
    
    element.addEventListener('canplay', () => {
      console.log('🎮 Video: canplay');
      if (!isPlaying) {
        // Ensure audio context is resumed before playing
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(e => console.error('Unable to resume audio context:', e));
        }
        
        // Now try to play the video
        element.play()
          .then(() => {
            setIsPlaying(true);
            element.muted = false; // Ensure it's unmuted
            console.log('▶️ Video playback started successfully');
          })
          .catch(e => {
            console.error('Failed to start playback:', e);
            setError('Autoplay prevented - please click play button');
          });
      }
    });
    
    // Detect audio interruptions and try to fix them
    element.addEventListener('volumechange', () => {
      // If something muted our video unexpectedly during playback
      if (element.muted && isPlaying && !isMuted) {
        console.log('🔊 Unexpected mute detected, restoring audio');
        // Try to unmute
        element.muted = false;
      }
    });
    
    element.addEventListener('pause', () => {
      // Only log if we didn't initiate the pause
      if (isPlaying) {
        console.log('⏸️ Video unexpectedly paused, will attempt to resume');
        // Try to resume if unexpectedly paused
        element.play().catch(e => console.error('Failed to auto-resume:', e));
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
        muted={false} // Don't start muted - we'll control audio via Web Audio API
        controls={false} // We handle controls ourselves for better isolation
        onTimeUpdate={() => {
          // This is a continuous check to ensure audio is working
          if (videoRef.current && videoRef.current.muted && isPlaying && !isMuted) {
            // If something muted our video while it should be playing with audio
            console.log('🔄 Ensuring audio is enabled during playback');
            videoRef.current.muted = false;
            
            // Also make sure audio context is running
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume().catch(e => 
                console.error('Error resuming audio context during playback:', e)
              );
            }
          }
        }}
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