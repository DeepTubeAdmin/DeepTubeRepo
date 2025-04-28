import { Vimeo } from '@vimeo/vimeo';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.VIMEO_CLIENT_ID || !process.env.VIMEO_CLIENT_SECRET || !process.env.VIMEO_ACCESS_TOKEN) {
  throw new Error('Missing required Vimeo environment variables');
}

// Initialize the Vimeo client
const client = new Vimeo(
  process.env.VIMEO_CLIENT_ID,
  process.env.VIMEO_CLIENT_SECRET,
  process.env.VIMEO_ACCESS_TOKEN
);

// Function to retrieve a video by its ID
export const getVideo = (videoId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'GET',
      path: `/videos/${videoId}`
    }, (error, body, statusCode, headers) => {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
};

// Function to upload a video to Vimeo
export const uploadVideo = (
  filePath: string, 
  name: string, 
  description: string,
  privacy: 'anybody' | 'password' | 'disable' | 'nobody' | 'unlisted' = 'anybody'
): Promise<any> => {
  return new Promise((resolve, reject) => {
    client.upload(
      filePath,
      {
        name,
        description,
        privacy: {
          view: privacy,
        },
      },
      (uri) => {
        // Video URI is returned on successful upload
        resolve({ uri, videoId: uri.split('/').pop() });
      },
      (error) => {
        reject(error);
      },
      () => {
        // Progress callback (optional)
      }
    );
  });
};

// Function to search for videos
export const searchVideos = (query: string, page = 1, perPage = 10): Promise<any> => {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'GET',
      path: '/videos',
      query: {
        query,
        page,
        per_page: perPage,
      },
    }, (error, body, statusCode, headers) => {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
};

// Function to get user's videos
export const getUserVideos = (page = 1, perPage = 10): Promise<any> => {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'GET',
      path: '/me/videos',
      query: {
        page,
        per_page: perPage,
      },
    }, (error, body, statusCode, headers) => {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
};

// Function to extract thumbnail from Vimeo video
export const getThumbnail = (videoData: any): string => {
  if (videoData && videoData.pictures && videoData.pictures.sizes && videoData.pictures.sizes.length > 0) {
    // Find a medium-sized thumbnail (around 640px wide)
    const mediumThumbnail = videoData.pictures.sizes.find((size: any) => size.width >= 640) || 
                          videoData.pictures.sizes[videoData.pictures.sizes.length - 1];
    return mediumThumbnail.link;
  }
  
  return ''; // Return empty string if no thumbnail is found
};

// Helper function to extract video ID from a Vimeo URL
export const extractVideoId = (vimeoUrl: string): string | null => {
  // Handle URLs like https://vimeo.com/123456789
  const regex = /vimeo\.com\/(\d+)/;
  const match = vimeoUrl.match(regex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
};

export default client;