/**
 * Google AdSense Configuration
 * 
 * This file contains the configuration for Google AdSense integration.
 * Configuration is controlled via environment variables in .env file.
 * 
 * To switch between test and production mode:
 * - Set VITE_GOOGLE_ADSENSE_TEST_MODE=true for test ads
 * - Set VITE_GOOGLE_ADSENSE_TEST_MODE=false for production ads
 */

// Check if test mode is enabled via environment variable
const isTestMode = import.meta.env.VITE_GOOGLE_ADSENSE_TEST_MODE === 'true';

// Development mode fallback (if no env var is set)
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Use test mode if explicitly enabled OR if in development and no real IDs are provided
const useTestMode = isTestMode || (isDevelopment && !import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID?.startsWith('ca-pub-'));

export const adsenseConfig = {
  // Google AdSense Publisher ID
  clientId: import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID as string,
  
  // Ad Slot IDs for different ad units
  slots: {
    contentFeed: import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID as string,
    // sidebar: import.meta.env.VITE_GOOGLE_ADSENSE_SIDEBAR_SLOT_ID as string,
    // video: import.meta.env.VITE_GOOGLE_ADSENSE_VIDEO_SLOT_ID as string,
    // footer: import.meta.env.VITE_GOOGLE_ADSENSE_FOOTER_SLOT_ID as string,
  },
  
  // Check if AdSense is properly configured
  isConfigured: () => {
    const clientId = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID;
    const slotId = import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID;
    const hasClientId = Boolean(clientId);
    const hasSlotId = Boolean(slotId);
    
    // Debug log to see what's happening
    // console.log('🔍 AdSense Debug:', {
    //   clientId,
    //   slotId,
    //   hasClientId,
    //   hasSlotId,
    //   configured: hasClientId && hasSlotId,
    //   mode: import.meta.env.MODE,
    //   dev: import.meta.env.DEV
    // });
    
    return hasClientId && hasSlotId;
  },
  
  // Helper to check if we're using test ads
  isTestMode: () => useTestMode,
  
  // Helper to get current mode info
  getModeInfo: () => ({
    isTestMode: useTestMode,
    isDevelopment,
    clientId: import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID,
    testModeEnabled: isTestMode
  })
};