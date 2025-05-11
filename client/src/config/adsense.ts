/**
 * Google AdSense Configuration
 * 
 * This file contains the configuration for Google AdSense integration.
 * The actual values should be provided as environment variables.
 */

export const adsenseConfig = {
  // Google AdSense Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
  clientId: import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID as string,
  
  // Ad Slot IDs for different ad units
  slots: {
    contentFeed: import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID as string,
    // You can add more slot IDs for different sections of the site
    // sidebar: import.meta.env.VITE_GOOGLE_ADSENSE_SIDEBAR_SLOT_ID as string,
    // footer: import.meta.env.VITE_GOOGLE_ADSENSE_FOOTER_SLOT_ID as string,
  },
  
  // Check if AdSense is properly configured
  isConfigured: () => {
    return Boolean(
      import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID && 
      import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID
    );
  }
};