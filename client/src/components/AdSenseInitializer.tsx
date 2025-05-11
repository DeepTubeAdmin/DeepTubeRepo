import { useEffect } from 'react';
import { adsenseConfig } from '../config/adsense';

/**
 * AdSenseInitializer
 * 
 * This component initializes the Google AdSense script when the app loads
 * if the required credentials are provided as environment variables.
 * It doesn't render anything visible.
 */
export function AdSenseInitializer() {
  useEffect(() => {
    // Only run if AdSense is properly configured
    if (!adsenseConfig.isConfigured()) {
      console.log('AdSense not configured, skipping initialization');
      return;
    }

    try {
      // Find the placeholder script tag
      const scriptElement = document.getElementById('adsense-script');
      
      if (scriptElement) {
        // Set the src attribute with the client ID
        scriptElement.setAttribute(
          'src',
          `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseConfig.clientId}`
        );
        scriptElement.setAttribute('crossorigin', 'anonymous');
        
        console.log('AdSense script initialized with client ID');
      } else {
        console.error('AdSense script element not found in the document');
      }
    } catch (error) {
      console.error('Error initializing AdSense script:', error);
    }
  }, []);

  // This component doesn't render anything
  return null;
}

export default AdSenseInitializer;