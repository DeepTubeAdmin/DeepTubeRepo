export interface Video {
  id: number;
  title: string;
  thumbnail: string;
  credits: number;
  resolution: "HD" | "4K";
  duration: number; // in seconds
  category: string;
  description?: string;
  aiGenerator?: string;
  prompt?: string;
  contentType?: "video" | "image" | "embed"; // Added to support videos, images, and embeds
  vimeoId?: string;   // Vimeo video ID
  videoUrl?: string;  // URL to the video file or Vimeo URL
  embedCode?: string; // Embed code for embedded content
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
