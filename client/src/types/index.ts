export interface Video {
  id: number;
  title: string;
  thumbnail: string;
  credits: number;
  resolution: "HD" | "4K";
  duration: number; // in seconds
  categoryId: number | null;
  category?: {
    id: number;
    name: string;
    slug: string;
    icon?: string;
    image?: string | null;
  };
  description: string | null;
  aiGenerator: string | null;
  prompt: string | null;
  contentType: "video" | "image" | "embed"; // Added to support videos, images, and embeds
  videoUrl: string | null;  // URL to the video file (S3 or direct URL)
  imageUrl: string | null;  // URL to the image file for image content type
  embedCode: string | null; // Embed code for embedded content
  userId: number | null;    // User ID who uploaded the video
  createdAt: string; // Creation timestamp
  tags: string | null;   // Comma-separated tags for the content
  
  // Additional fields needed for search results
  featured: boolean;     // Whether the video is featured
  views: number;         // View count
  preview: boolean;      // Whether preview is enabled
  likes: number;         // Like count
  reviewStatus: 'pending' | 'approved' | 'rejected'; // Current review status
  
  // Fields for detailed content management
  vimeoId: string | null;           // ID for Vimeo videos (legacy)
  reviewedAt: string | null;        // When the video was reviewed
  reviewedBy: number | null;        // Who reviewed the video
  rejectionReason: string | null;   // Reason for rejection if rejected
  uploaderName: string;             // Name of the uploader
  uploaderId: number | null;        // ID of the uploader
  adminNotice?: string;             // Admin-only notice about content status
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
