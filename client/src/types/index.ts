export interface Video {
  id: number;
  title: string;
  thumbnail: string;
  credits: number;
  resolution: "HD" | "4K";
  duration: number; // in seconds
  categoryId: number;
  category?: {
    id: number;
    name: string;
    slug: string;
    icon?: string;
    image?: string | null;
  };
  description?: string;
  aiGenerator?: string;
  prompt?: string;
  contentType?: "video" | "image" | "embed"; // Added to support videos, images, and embeds
  videoUrl?: string;  // URL to the video file (S3 or direct URL)
  imageUrl?: string;  // URL to the image file for image content type
  embedCode?: string; // Embed code for embedded content
  userId?: number;    // User ID who uploaded the video
  createdAt?: string; // Creation timestamp
  
  // Additional fields needed for search results
  featured?: boolean;     // Whether the video is featured
  views?: number;         // View count
  preview?: boolean;      // Whether preview is enabled
  likes?: number;         // Like count
  reviewStatus?: 'pending' | 'approved' | 'rejected'; // Current review status
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  slug: string;
}

export interface PopularCategory {
  id: number;
  name: string;
  image: string;
  count: number;
}

export interface CreditPackage {
  id: number;
  amount: number;
  price: number;
  discount?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
}
