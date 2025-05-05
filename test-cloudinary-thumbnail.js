
const cloudinaryService = require('./server/services/cloudinaryService').default;

async function testCloudinaryThumbnail() {
  const testVideoId = 1746389503;
  const videoUrl = 'https://deeptubebucket.s3.us-east-2.amazonaws.com/uploads/file-1746389503594-952104822.mov';
  
  console.log('Testing Cloudinary thumbnail generation...');
  console.log(`Video URL: ${videoUrl}`);
  
  try {
    const s3Key = await cloudinaryService.generateThumbnail(
      testVideoId,
      videoUrl,
      'video'
    );
    
    console.log('Success! Thumbnail generated and saved to S3:');
    console.log(`S3 Key: ${s3Key}`);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
  }
}

testCloudinaryThumbnail();
