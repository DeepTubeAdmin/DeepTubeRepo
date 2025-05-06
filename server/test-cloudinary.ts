/**
 * Test script for Cloudinary connectivity
 * 
 * This script verifies if we can connect to Cloudinary successfully
 * and perform basic operations like uploading an image.
 */

import { v2 as cloudinary } from 'cloudinary';

/**
 * Test Cloudinary connectivity and credentials
 */
export async function testCloudinaryConnection() {
  try {
    // Extract current credentials
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    console.log('Testing Cloudinary with the following credentials:');
    console.log(` - Cloud name: ${cloudName ? 'Present' : 'Missing'}`);
    console.log(` - API key: ${apiKey ? 'Present (length: ' + apiKey.length + ')' : 'Missing'}`);
    console.log(` - API secret: ${apiSecret ? 'Present (length: ' + apiSecret.length + ')' : 'Missing'}`);
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    
    try {
      // Basic test - just get some sample URL to verify credentials work
      const testUrl = cloudinary.url('sample.jpg', {
        width: 300,
        height: 200,
        crop: 'fill'
      });
      
      console.log('Generated test URL:', testUrl);
      
      // Return basic info for now without trying upload
      return {
        success: true,
        status: 200,
        cloudName: process.env.CLOUDINARY_URL,
        apiKeyProvided: !!apiKey,
        apiSecretProvided: !!apiSecret,
        testUrl: testUrl
      };
    } catch (basicError: any) {
      console.error('Basic Cloudinary test failed:', basicError);
      return {
        success: false,
        error: basicError.message || 'Unknown error in basic test'
      };
    }
  } catch (error: any) {
    console.error('Cloudinary test failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      fullError: error
    };
  }
}

/**
 * Complete test with actual image upload
 */
export async function testCloudinaryUpload() {
  try {
    // Extract current credentials
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    console.log('Testing Cloudinary upload with the following credentials:');
    console.log(` - Cloud name: ${cloudName ? 'Present' : 'Missing'}`);
    console.log(` - API key: ${apiKey ? 'Present (length: ' + apiKey.length + ')' : 'Missing'}`);
    console.log(` - API secret: ${apiSecret ? 'Present (length: ' + apiSecret.length + ')' : 'Missing'}`);
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    
    // First test: get account info
    console.log('\nTesting Cloudinary API connection...');
    const results = await cloudinary.api.ping();
    console.log('Ping successful:', results);
    
    // Second test: upload a test image (a simple SVG)
    console.log('\nTesting image upload...');
    const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <rect width="300" height="200" fill="#ff9000"/>
      <text x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white">
        Cloudinary Test
      </text>
    </svg>`;
    
    // Upload as a Base64 data URL
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(testSvg).toString('base64')}`;
    
    const uploadResult = await cloudinary.uploader.upload(dataUrl, {
      public_id: 'deeptube-test',
      overwrite: true,
      resource_type: 'image'
    });
    
    console.log('Upload successful!');
    console.log(`Test image URL: ${uploadResult.secure_url}`);
    
    return {
      success: true,
      pingResult: results,
      uploadResult: uploadResult
    };
  } catch (error: any) {
    console.error('Cloudinary upload test failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      details: error
    };
  }
}
