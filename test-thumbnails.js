// Test script to regenerate thumbnails for all videos
const fetch = require('node-fetch');

async function regenerateAllThumbnails() {
  try {
    // Get all videos
    const response = await fetch('http://localhost:5000/api/videos');
    const videos = await response.json();
    
    console.log(`Found ${videos.length} videos to process`);
    
    // Process each video
    for (const video of videos) {
      console.log(`Processing video ${video.id}: ${video.title}`);
      
      try {
        // Call the regenerate endpoint
        const regenerateResponse = await fetch(`http://localhost:5000/api/regenerate-thumbnail/${video.id}`);
        const result = await regenerateResponse.json();
        
        console.log(`Result for ${video.id}: ${result.success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error(`Error regenerating thumbnail for video ${video.id}:`, error.message);
      }
      
      // Wait a bit between requests to avoid overloading the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Thumbnail regeneration complete!');
  } catch (error) {
    console.error('Error fetching videos:', error);
  }
}

regenerateAllThumbnails();
