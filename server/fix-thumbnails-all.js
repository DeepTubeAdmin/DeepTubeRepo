import { storage as dbStorage } from "./storage.js";
import { getSignedS3Url, uploadStringToS3 } from "./s3.js";

// Generate placeholder SVG for videos and images
function getPlaceholderSvg(contentType = 'video') {
  console.log(`Creating placeholder SVG for content type: ${contentType}`);
  
  // For image content, show a different placeholder
  if (contentType === 'image' || contentType === 'images') {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
  <rect width="400" height="225" fill="#111" />
  <rect x="150" y="62.5" width="100" height="100" fill="#222" />
  <circle cx="200" cy="92.5" r="10" fill="#f97316" />
  <rect x="175" y="112.5" width="50" height="30" fill="#333" />
  <text x="200" y="200" fill="#f97316" font-family="Arial" font-size="14" text-anchor="middle">AI Generated Image</text>
</svg>
`;
  }
  
  // Default video placeholder with play button
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
  <rect width="400" height="225" fill="#111" />
  <circle cx="200" cy="112.5" r="50" fill="#222" />
  <polygon points="185,90 185,135 225,112.5" fill="#f97316" stroke="#000" stroke-width="2" />
  <text x="200" y="200" fill="#f97316" font-family="Arial" font-size="14" text-anchor="middle">AI Generated Video</text>
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
        // Determine the appropriate placeholder based on content type
        let contentType = video.contentType || 'video';
        
        // Normalize content type
        if (contentType === 'images') contentType = 'image';
        if (contentType === 'videos') contentType = 'video';
        
        console.log(`Using content type: ${contentType} for video ID ${video.id}`);
        
        // Upload a placeholder SVG as string with the appropriate placeholder
        await uploadStringToS3(getPlaceholderSvg(contentType), s3Key, 'image/svg+xml');
        
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
