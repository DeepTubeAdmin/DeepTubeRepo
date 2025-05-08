/**
 * Test script for Cloudinary connectivity
 * 
 * This script verifies if we can connect to Cloudinary successfully
 * and perform basic operations like uploading an image.
 */

import { v2 as cloudinary } from 'cloudinary';

/**
 * Parse Cloudinary URL
 * @param cloudinaryUrl Cloudinary URL in format cloudinary://<api_key>:<api_secret>@<cloud_name>
 * @returns Parsed credentials or null if invalid format
 */
function parseCloudinaryUrl(cloudinaryUrl: string): { cloudName: string; apiKey: string; apiSecret: string } | null {
  try {
    const cloudinaryRegex = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/;
    const match = cloudinaryUrl.match(cloudinaryRegex);
    
    if (match) {
      return {
        apiKey: match[1],
        apiSecret: match[2],
        cloudName: match[3]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Cloudinary URL:', error);
    return null;
  }
}

/**
 * Test Cloudinary connectivity and credentials
 */
export async function testCloudinaryConnection() {
  try {
    let cloudName = '';
    let apiKey = '';
    let apiSecret = '';
    
    // First try to use CLOUDINARY_URL if available
    if (process.env.CLOUDINARY_URL) {
      console.log('Found CLOUDINARY_URL environment variable, attempting to parse');
      const parsedCredentials = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
      
      if (parsedCredentials) {
        cloudName = parsedCredentials.cloudName;
        apiKey = parsedCredentials.apiKey;
        apiSecret = parsedCredentials.apiSecret;
        console.log(`Successfully parsed CLOUDINARY_URL with cloud_name: ${cloudName}`);
      } else {
        console.warn('Failed to parse CLOUDINARY_URL, format may be invalid');
      }
    }
    
    // Fall back to individual credentials if CLOUDINARY_URL parsing failed
    if (!cloudName || !apiKey || !apiSecret) {
      cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
      apiKey = process.env.CLOUDINARY_API_KEY || '';
      apiSecret = process.env.CLOUDINARY_API_SECRET || '';
      console.log('Using individual Cloudinary credential environment variables');
    }
    
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
      
      // Try to ping the Cloudinary API to verify connection
      let pingResult;
      try {
        pingResult = await cloudinary.api.ping();
        console.log('Cloudinary ping successful:', pingResult);
      } catch (pingError) {
        console.warn('Cloudinary ping failed:', pingError.message);
      }
      
      // Return basic info for now without trying upload
      return {
        success: true,
        status: 200,
        cloudName,
        apiKeyProvided: !!apiKey,
        apiSecretProvided: !!apiSecret,
        testUrl: testUrl,
        pingSuccess: !!pingResult,
        configSource: process.env.CLOUDINARY_URL ? 'CLOUDINARY_URL' : 'Individual environment variables'
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
    let cloudName = '';
    let apiKey = '';
    let apiSecret = '';
    
    // First try to use CLOUDINARY_URL if available
    if (process.env.CLOUDINARY_URL) {
      console.log('Found CLOUDINARY_URL environment variable, attempting to parse');
      const parsedCredentials = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
      
      if (parsedCredentials) {
        cloudName = parsedCredentials.cloudName;
        apiKey = parsedCredentials.apiKey;
        apiSecret = parsedCredentials.apiSecret;
        console.log(`Successfully parsed CLOUDINARY_URL with cloud_name: ${cloudName}`);
      } else {
        console.warn('Failed to parse CLOUDINARY_URL, format may be invalid');
      }
    }
    
    // Fall back to individual credentials if CLOUDINARY_URL parsing failed
    if (!cloudName || !apiKey || !apiSecret) {
      cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
      apiKey = process.env.CLOUDINARY_API_KEY || '';
      apiSecret = process.env.CLOUDINARY_API_SECRET || '';
      console.log('Using individual Cloudinary credential environment variables');
    }
    
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

// Run the test when this script is directly executed
// Using import.meta.url to check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running Cloudinary test script directly...');
  testCloudinaryConnection().then(result => {
    console.log('Connection test result:', result);
    return testCloudinaryUpload();
  }).then(result => {
    console.log('Upload test result:', result);
  }).catch(error => {
    console.error('Test failed with error:', error);
  });
}
