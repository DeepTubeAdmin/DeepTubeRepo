# Google AdSense Integration for DeepTube

This document provides instructions for setting up Google AdSense with DeepTube, including test mode for development.

## Test Mode (Current Setup)

Your project is currently configured for **TEST MODE** using Google's official test ad unit IDs. This allows you to:
- ✅ See real Google test ads during development
- ✅ Safely click and interact with ads without affecting your account
- ✅ Test ad placement and styling

### Current Test Configuration (.env):
```bash
VITE_GOOGLE_ADSENSE_TEST_MODE=true
VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-app-pub-3940256099942544
VITE_GOOGLE_ADSENSE_SLOT_ID=6300978111
VITE_GOOGLE_ADSENSE_SIDEBAR_SLOT_ID=6300978111
VITE_GOOGLE_ADSENSE_VIDEO_SLOT_ID=5219068958
```

## Production Setup (When AdSense is Approved)

### Prerequisites

1. A Google AdSense account that has been approved by Google
2. Your AdSense Publisher ID (looks like `ca-pub-XXXXXXXXXXXXXXXX`)
3. At least one Ad Unit created in your AdSense account with its Slot ID

### Setup Steps

#### 1. Get Your AdSense Publisher ID

- Log in to your Google AdSense account at [https://www.google.com/adsense](https://www.google.com/adsense)
- Go to Settings > Account information
- Look for your "Publisher ID" (it starts with `ca-pub-`)

#### 2. Create Ad Units

Create different ad units for different sections:
- In your AdSense account, go to "Ads" > "By ad unit"
- Click "+ New ad unit"
- Choose "Display ads"
- Create units for:
  - **Content Feed** (rectangle/square ads in content grid)
  - **Sidebar** (banner ads in sidebar areas)
  - **Video** (video ads if needed)

#### 3. Update Environment Variables

Update your `.env` file with your real AdSense credentials:

#### 3. Update Environment Variables

Update your `.env` file with your real AdSense credentials:

```bash
# Switch to production mode
VITE_GOOGLE_ADSENSE_TEST_MODE=false

# Your real AdSense credentials
VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-YOUR_REAL_PUBLISHER_ID
VITE_GOOGLE_ADSENSE_SLOT_ID=YOUR_CONTENT_FEED_SLOT_ID
VITE_GOOGLE_ADSENSE_SIDEBAR_SLOT_ID=YOUR_SIDEBAR_SLOT_ID
VITE_GOOGLE_ADSENSE_VIDEO_SLOT_ID=YOUR_VIDEO_SLOT_ID
```

#### 4. Deploy and Verify

1. Restart your application after updating the `.env` file
2. The test ad badges should disappear
3. Real AdSense ads should start displaying
4. Monitor your AdSense dashboard for impressions and clicks

## Configuration Modes

### Test Mode (VITE_GOOGLE_ADSENSE_TEST_MODE=true)
- ✅ Uses Google's official test ad unit IDs
- ✅ Safe to click and interact with
- ✅ Shows "TEST AD" badge for identification
- ✅ Perfect for development and staging

### Production Mode (VITE_GOOGLE_ADSENSE_TEST_MODE=false)
- ✅ Uses your real AdSense credentials
- ✅ Generates real revenue
- ✅ No test badges shown
- ⚠️ Do NOT click your own ads (can lead to account suspension)

## Troubleshooting

### Ads Not Showing
- **Test Mode**: Check browser console for errors, ensure test IDs are correct
- **Production**: Verify your Publisher ID and Slot IDs are correct
- **Both**: It may take time for Google to start serving ads

### Script Not Loading
- Check that the AdSenseInitializer component is mounted in your App.tsx
- Verify your Publisher ID format (should start with `ca-pub-`)

### Ad Placement Issues
- Adjust styling in the GoogleAdSense component
- Ensure sufficient space for ad containers
- Check responsive design on different screen sizes

## Environment Variable Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GOOGLE_ADSENSE_TEST_MODE` | Enable/disable test mode | `true` or `false` |
| `VITE_GOOGLE_ADSENSE_CLIENT_ID` | Your AdSense Publisher ID | `ca-pub-1234567890123456` |
| `VITE_GOOGLE_ADSENSE_SLOT_ID` | Content feed ad slot | `1234567890` |
| `VITE_GOOGLE_ADSENSE_SIDEBAR_SLOT_ID` | Sidebar ad slot | `0987654321` |
| `VITE_GOOGLE_ADSENSE_VIDEO_SLOT_ID` | Video ad slot | `1122334455` |

## Adding More Ad Locations

To add ads in new locations:

1. **Create new ad unit** in your AdSense dashboard
2. **Add environment variable** for the new slot ID
3. **Update adsense.ts** to include the new slot:
   ```typescript
   slots: {
     // ...existing slots...
     newLocation: import.meta.env.VITE_GOOGLE_ADSENSE_NEW_SLOT_ID as string,
   }
   ```
4. **Use GoogleAdSense component** in your desired location:
   ```tsx
   <GoogleAdSense 
     slot={adsenseConfig.slots.newLocation}
     format="auto"
     responsive={true}
   />
   ```

## Important Notes

- 🚫 **Never click your own production ads** - This violates AdSense policies
- ✅ **Use test mode for development** - Always safe to click test ads
- 📊 **Monitor performance** - Check AdSense dashboard regularly
- 🔄 **Update regularly** - Keep ad placements optimized for better revenue