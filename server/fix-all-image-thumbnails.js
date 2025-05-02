// Script to fix all image thumbnails
import { generateAndStoreS3Thumbnail } from './generateThumbnail.ts';
import { storage as dbStorage } from './storage.ts';

// For ESM compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * This script finds all image content and regenerates their thumbnails
 * directly from the original image URLs
 */
async function fixAllImageThumbnails() {
  try {
    console.log('Starting image thumbnail repair process...');
    
    // Get all images from database
    const images = await dbStorage.getVideos(1000, 'image');
    console.log(`Found ${images.length} images to process`);
    
    const results = {
      success: 0,
      failed: 0,
      items: []
    };
    
    // Process each image
    for (const image of images) {
      try {
        console.log(`Processing image ID ${image.id}: ${image.title}`);
        
        // Skip if no imageUrl
        if (!image.imageUrl) {
          console.log(`Image ${image.id} has no imageUrl, skipping`);
          results.items.push({
            id: image.id,
            title: image.title,
            status: 'skipped',
            reason: 'No imageUrl'
          });
          continue;
        }
        
        // If image is already a URL, use that to regenerate the thumbnail
        if (image.imageUrl.startsWith('http')) {
          console.log(`Image ${image.id} using URL: ${image.imageUrl}`);
          
          // Generate thumbnail using the imageUrl as source
          const s3Key = await generateAndStoreS3Thumbnail(
            image.id,
            'image',
            image.imageUrl
          );
          
          // Update the database to use the thumbnail endpoint
          await dbStorage.updateVideo(image.id, {
            thumbnail: `/api/videos/${image.id}/thumbnail`
          });
          
          console.log(`Successfully fixed thumbnail for image ${image.id}`);
          results.success++;
          
          results.items.push({
            id: image.id,
            title: image.title,
            status: 'success',
            source: 'imageUrl',
            s3Key
          });
        }
        // Handle base64 images
        else if (image.imageUrl.startsWith('data:image')) {
          console.log(`Image ${image.id} has base64 data, converting to S3`);
          
          // Extract the base64 data
          const base64Data = image.imageUrl.split(',')[1];
          if (!base64Data) {
            console.log(`Invalid base64 data format for image ${image.id}`);
            results.failed++;
            results.items.push({
              id: image.id,
              title: image.title,
              status: 'failed',
              reason: 'Invalid base64 format'
            });
            continue;
          }
          
          // Generate S3 key
          const s3Key = `thumbnails/video-${image.id}.jpg`;
          
          // Upload to S3
          const { uploadStringToS3 } = await import('./s3.ts');
          await uploadStringToS3(base64Data, s3Key, 'image/jpeg', 'base64');
          
          // Update the database to use the thumbnail endpoint
          await dbStorage.updateVideo(image.id, {
            thumbnail: `/api/videos/${image.id}/thumbnail`
          });
          
          console.log(`Successfully fixed thumbnail for image ${image.id}`);
          results.success++;
          
          results.items.push({
            id: image.id,
            title: image.title,
            status: 'success',
            source: 'base64',
            s3Key
          });
        }
        // No valid image source, use placeholder
        else {
          console.log(`Image ${image.id} has no valid source, using placeholder`);
          
          // Update the database to use the thumbnail endpoint
          await dbStorage.updateVideo(image.id, {
            thumbnail: `/api/videos/${image.id}/thumbnail`
          });
          
          results.failed++;
          results.items.push({
            id: image.id,
            title: image.title,
            status: 'placeholder',
            reason: 'No valid image source'
          });
        }
      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error);
        results.failed++;
        results.items.push({
          id: image.id,
          title: image.title,
          status: 'error',
          error: error.message
        });
      }
    }
    
    console.log('====== Image Thumbnail Fix Summary ======');
    console.log(`Total processed: ${images.length}`);
    console.log(`Success: ${results.success}`);
    console.log(`Failed/Placeholder: ${results.failed}`);
    console.log('========================================');
    
    return results;
  } catch (error) {
    console.error('Fatal error during image thumbnail fix:', error);
    throw error;
  }
}

// When imported as a module, export the function
export default fixAllImageThumbnails;

// When run directly, execute the function
if (process.argv[1] === import.meta.url) {
  fixAllImageThumbnails().then(() => {
    console.log('Image thumbnail fix process completed!');
  }).catch(error => {
    console.error('Image thumbnail fix process failed:', error);
  });
}
