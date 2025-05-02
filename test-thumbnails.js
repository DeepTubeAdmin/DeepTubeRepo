
// Test script for thumbnail system improvements
import fetch from 'node-fetch';

async function testThumbnailSystem() {
  try {
    console.log('Starting thumbnail system tests...\n');
    
    // Test 1: Basic thumbnail retrieval
    console.log('Test 1: Basic thumbnail retrieval');
    const response = await fetch('http://0.0.0.0:5000/api/videos/1/thumbnail');
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    // Test 2: S3 URL caching
    console.log('\nTest 2: S3 URL caching');
    const start = Date.now();
    await Promise.all([
      fetch('http://0.0.0.0:5000/api/videos/1/thumbnail'),
      fetch('http://0.0.0.0:5000/api/videos/1/thumbnail')
    ]);
    console.log(`Cache test completed in ${Date.now() - start}ms`);
    
    // Test 3: Different content types
    console.log('\nTest 3: Content type handling');
    const types = ['video', 'image', 'embed'];
    for (const type of types) {
      const typeResponse = await fetch(`http://0.0.0.0:5000/api/fix-thumbnails-all?type=${type}`);
      console.log(`${type}: ${typeResponse.status}`);
    }
    
    // Test 4: Error handling
    console.log('\nTest 4: Error handling');
    const errorResponse = await fetch('http://0.0.0.0:5000/api/videos/999999/thumbnail');
    console.log(`Invalid ID test: ${errorResponse.status}`);
    
    console.log('\nTesting completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testThumbnailSystem();
