import { storage as dbStorage } from "./storage.js";
import { getSignedS3Url, uploadStringToS3 } from "./s3.js";

// Generate placeholder SVG for videos
function getPlaceholderSvg() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
  <rect width="400" height="225" fill="#111" />
  <circle cx="200" cy="112.5" r="50" fill="#222" />
  <polygon points="185,90 185,135 225,112.5" fill="#f97316" stroke="#000" stroke-width="2" />
</svg>
`;
}

// Function to fix all thumbnails
async function fixAllThumbnails() {
  console.log('Starting thumbnail fix process...');
  
  try {
    // Get all videos with a large limit to ensure we get everything
    console.log('Retrieving all videos from database...');
    
    // dbStorage.getVideos(limit, contentType, offset, sortBy)
    // Using a large limit (1000) to make sure we get all videos
    const videos = await dbStorage.getVideos(1000);
    console.log(`Retrieved ${videos.length} videos. First few IDs: [ ${videos.slice(0, 3).map(v => v.id)} ]`);
    
    console.log(`Found ${videos.length} videos to process`);
    
    for (const video of videos) {
      const s3Key = `thumbnails/video-${video.id}.jpg`;
      console.log(`Processing video ${video.id} (${video.title}): Uploading to ${s3Key}`);
      
      try {
        // Upload a placeholder SVG as string
        await uploadStringToS3(getPlaceholderSvg(), s3Key, 'image/svg+xml');
        
        // Update the video record to use our thumbnail endpoint
        await dbStorage.updateVideo(video.id, { 
          thumbnail: `/api/videos/${video.id}/thumbnail` 
        });
        
        console.log(`✅ Successfully fixed thumbnail for video ${video.id}`);
      } catch (error) {
        console.error(`❌ Failed to fix thumbnail for video ${video.id}:`, error);
      }
    }
    
    console.log('✅ Successfully processed all videos');
  } catch (error) {
    console.error('Error fixing thumbnails:', error);
  }
}

// Run the function
fixAllThumbnails().catch(console.error);
