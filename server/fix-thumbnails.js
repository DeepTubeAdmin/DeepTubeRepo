// Script to fix all thumbnails by uploading placeholders to S3
// Usage: NODE_ENV=development tsx server/fix-thumbnails.js

import { storage } from './storage.js';
import { uploadStringToS3 } from './s3.js';

// Simple SVG placeholder directly in the code to avoid file system issues
const placeholderSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
  <rect width="400" height="225" fill="#111" />
  <circle cx="200" cy="112.5" r="50" fill="#222" />
  <polygon points="185,90 185,135 225,112.5" fill="#f97316" stroke="#000" stroke-width="2" />
</svg>
`;

async function fixAllThumbnails() {
  try {
    console.log('Starting thumbnail fix process...');
    
    // Get all videos
    const videos = await storage.getVideos();
    console.log(`Found ${videos.length} videos to process`);
    
    // Process each video
    let successCount = 0;
    let errorCount = 0;
    
    for (const video of videos) {
      try {
        // Define S3 key for video thumbnail
        const s3Key = `thumbnails/video-${video.id}.jpg`;
        
        console.log(`Processing video ${video.id} (${video.title}): Uploading to ${s3Key}`);
        
        // Upload the SVG placeholder to S3 with public-read ACL, directly using string
        await uploadStringToS3(placeholderSvg, s3Key, 'image/svg+xml');
        
        // Update the video record to use our thumbnail endpoint
        await storage.updateVideo(video.id, { 
          thumbnail: `/api/videos/${video.id}/thumbnail` 
        });
        
        console.log(`✅ Successfully fixed thumbnail for video ${video.id}`);
        successCount++;
      } catch (videoError) {
        console.error(`❌ Error fixing thumbnail for video ${video.id}:`, videoError);
        errorCount++;
      }
      
      // Add small delay to avoid overwhelming S3
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\nThumbnail fix process complete');
    console.log(`✅ Successfully fixed ${successCount} thumbnails`);
    console.log(`❌ Failed to fix ${errorCount} thumbnails`);
  } catch (error) {
    console.error('Error in thumbnail fix process:', error);
  }
}

// Run the function
fixAllThumbnails().catch(console.error);
