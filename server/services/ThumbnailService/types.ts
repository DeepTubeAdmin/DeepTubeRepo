/**
 * Type definitions for the unified ThumbnailService
 */

// Thumbnail generation options
export interface ThumbnailOptions {
  // Source media options
  contentId: number;
  contentType: string; // 'video', 'image', 'embed', etc.
  sourceUrl?: string | null;
  youtubeId?: string | null;
  base64Data?: string | null;
  
  // Processing options
  width?: number;
  height?: number;
  generatePlaceholder?: boolean;
  forceRegeneration?: boolean;
}

// Thumbnail generation result
export interface ThumbnailResult {
  success: boolean;
  thumbnailPath: string; // S3 key for the thumbnail
  contentType: string; // MIME type
  url?: string; // Fully qualified URL (if available)
  method: string; // How the thumbnail was generated ('youtube', 'cloudinary', 'placeholder', etc.)
  error?: any; // Error object if generation failed
}

// Cloudinary specific options
export interface CloudinaryOptions {
  resourceType?: 'image' | 'video' | 'auto';
  transformation?: any[];
  format?: string;
  publicId?: string;
}

// S3 storage options
export interface StorageOptions {
  contentType?: string;
  expiresIn?: number;
  encoding?: string;
  cacheControl?: string;
}
