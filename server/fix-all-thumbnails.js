// Script to fix all thumbnails by uploading SVG placeholders to S3
// Usage: NODE_ENV=development tsx server/fix-all-thumbnails.js

import { storage } from './storage.js';
import { uploadFileToS3 } from './s3.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixAllThumbnails() {
  try {
    console.log('Starting thumbnail fix process...');
    
    // Get all videos
    const videos = await storage.getVideos();
    console.log(`Found ${videos.length} videos to process`);
    
    // Path to placeholder SVG
    const placeholderPath = path.resolve('./public/default-video-thumbnail.svg');
    console.log(`Using placeholder SVG at: ${placeholderPath}`);
    
    // Process each video
    let successCount = 0;
    let errorCount = 0;
    
    for (const video of videos) {
      try {
        // Define S3 key for video thumbnail
        const s3Key = `thumbnails/video-${video.id}.jpg`;
        
        console.log(`Processing video ${video.id} (${video.title}): Uploading to ${s3Key}`);
        
        // Upload the SVG placeholder to S3 with public-read ACL
        await uploadFileToS3(placeholderPath, s3Key);
        
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
