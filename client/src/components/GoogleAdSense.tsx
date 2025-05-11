import React, { useEffect, useRef } from 'react';

interface GoogleAdSenseProps {
  className?: string;
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function GoogleAdSense({
  className = '',
  slot,
  format = 'auto',
  responsive = true,
  style = {}
}: GoogleAdSenseProps) {
  // We use a useEffect hook to initialize ads, no ref needed
  const clientId = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID;
  
  useEffect(() => {
    try {
      // Initialize adsbygoogle if it doesn't exist
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
      }
      
      // Push the ad to the queue for processing
      window.adsbygoogle.push({});
      
      console.log('AdSense ad pushed to queue');
    } catch (error) {
      console.error('Error initializing AdSense ad:', error);
    }
    
    // Cleanup function (if needed)
    return () => {
      // Any cleanup needed when component unmounts
    };
  }, []);
  
  // If client ID is not available, show a placeholder
  if (!clientId) {
    return (
      <div 
        className={`bg-gray-800 text-white flex items-center justify-center text-sm p-4 ${className}`}
        style={style}
      >
        <p>AdSense Client ID not configured</p>
      </div>
    );
  }
  
  return (
    <div className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          overflow: 'hidden',
          ...style
        }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}