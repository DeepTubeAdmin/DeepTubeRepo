// Script to fix all thumbnails by regenerating using FFmpeg and S3
// Usage: NODE_ENV=development tsx server/fix-all-thumbnails.js

import { storage } from './storage.js';
import { generateAndStoreS3Thumbnail } from './generateThumbnail.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates thumbnails for all videos and images in the database
 * Uses FFmpeg for videos and pulls direct images for images
 * Falls back to SVG placeholders if both methods fail
 */
async function fixAllThumbnails() {
  try {
    console.log('Starting FFmpeg thumbnail regeneration process...');
    
    // Get all videos
    const videos = await storage.getVideos();
    console.log(`Found ${videos.length} videos/images to process`);
    
    // Process each video
    let successCount = 0;
    let errorCount = 0;
    
    for (const video of videos) {
      try {
        console.log(`\nProcessing item ${video.id}: ${video.title}`);
        console.log(`  Type: ${video.content_type || 'unknown'}`);
        console.log(`  URL: ${video.video_url || 'none'}`);
        
        // Generate thumbnail using our advanced FFmpeg/S3 generator
        const s3Key = await generateAndStoreS3Thumbnail(
          video.id,
          video.content_type || 'video',
          video.video_url, 
          video.youtube_id
        );
        
        // Update the video record to use our S3-based thumbnail endpoint
        await storage.updateVideo(video.id, { 
          thumbnail: `/api/videos/${video.id}/thumbnail` 
        });
        
        console.log(`✅ Successfully generated and uploaded thumbnail to ${s3Key}`);
        successCount++;
      } catch (videoError) {
        console.error(`❌ Error generating thumbnail for item ${video.id}:`, videoError);
        errorCount++;
      }
      
      // Add small delay to avoid overwhelming S3 and FFmpeg
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('\nThumbnail regeneration process complete');
    console.log(`✅ Successfully generated ${successCount} thumbnails`);
    console.log(`❌ Failed to generate ${errorCount} thumbnails`);
  } catch (error) {
    console.error('Error in thumbnail regeneration process:', error);
  }
}

// Run the function
fixAllThumbnails().catch(console.error);
