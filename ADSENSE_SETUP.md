# Google AdSense Integration for DeepTube

This document provides instructions for setting up Google AdSense with DeepTube once your AdSense account is approved.

## Prerequisites

1. A Google AdSense account that has been approved by Google
2. Your AdSense Publisher ID (looks like `ca-pub-XXXXXXXXXXXXXXXX`)
3. At least one Ad Unit created in your AdSense account with its Slot ID

## Setup Steps

### 1. Get Your AdSense Publisher ID

- Log in to your Google AdSense account at [https://www.google.com/adsense](https://www.google.com/adsense)
- Go to Settings > Account information
- Look for your "Publisher ID" (it starts with `ca-pub-`)

### 2. Create an Ad Unit

If you haven't already:
- In your AdSense account, go to "Ads" > "By ad unit"
- Click "+ New ad unit"
- Choose "Display ads"
- Give your ad unit a name (e.g., "DeepTube Content Feed")
- Configure the ad settings as desired
- Click "Create"
- Copy the Ad Slot ID from the generated ad code (it's the value in `data-ad-slot="XXXXXXXXXX"`)

### 3. Set Environment Variables

Add these environment variables to your Replit project:

- `VITE_GOOGLE_ADSENSE_CLIENT_ID`: Your Publisher ID (e.g., `ca-pub-XXXXXXXXXXXXXXXX`)
- `VITE_GOOGLE_ADSENSE_SLOT_ID`: Your Ad Slot ID for the content feed (e.g., `XXXXXXXXXX`)

In Replit, you can set these by:
1. Going to the "Secrets" tab in your Replit project
2. Adding each variable with its corresponding value

### 4. Verify Integration

Once you've set the environment variables:

1. Restart your application
2. The AdSenseInitializer component will automatically detect your credentials and update the script tag
3. Your ad placeholders should now be replaced with actual Google AdSense ads

## Troubleshooting

- **Ads Not Showing**: It may take some time for Google to start serving ads after your account is approved. Check the browser console for any errors.
- **Script Not Loading**: Verify that your Publisher ID is correct and that the AdSenseInitializer component is properly mounted.
- **Ad Placement Issues**: You may need to adjust the styling in the GoogleAdSense component to better fit your layout.

## Additional Ad Units

To add more ad units in different locations:

1. Create new ad units in your AdSense account and get their Slot IDs
2. Add new environment variables for each ad unit (e.g., `VITE_GOOGLE_ADSENSE_SIDEBAR_SLOT_ID`)
3. Update the `adsenseConfig` in `client/src/config/adsense.ts` to include these new slots
4. Use the GoogleAdSense component in the desired locations with the appropriate slot ID

## Notes on Testing

- Google prohibits clicking on your own ads, which can lead to account suspension
- Use the AdSense preview mode for testing instead of clicking on live ads
- For extensive testing, consider using Google Ad Manager's test mode