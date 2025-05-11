import React, { useEffect } from 'react';
import { adsenseConfig } from '../config/adsense';

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
  const clientId = adsenseConfig.clientId;
  const isConfigured = adsenseConfig.isConfigured();
  
  useEffect(() => {
    // Only run if AdSense is properly configured
    if (!isConfigured) {
      return;
    }
    
    try {
      // Initialize adsbygoogle if it doesn't exist
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
      }
      
      // Push the ad to the queue for processing
      window.adsbygoogle.push({});
      
      console.log(`AdSense ad pushed to queue with slot: ${slot}`);
    } catch (error) {
      console.error('Error initializing AdSense ad:', error);
    }
  }, [slot, isConfigured]);
  
  // If client ID is not available, show a placeholder
  if (!isConfigured) {
    return (
      <div 
        className={`bg-gray-800 text-white flex items-center justify-center text-sm p-4 ${className}`}
        style={style}
      >
        <p>AdSense not yet configured</p>
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