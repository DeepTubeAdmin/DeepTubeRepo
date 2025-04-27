export interface Video {
  id: number;
  title: string;
  thumbnail: string;
  credits: number;
  resolution: "HD" | "4K";
  duration: number; // in seconds
  category: string;
  contentType?: "video" | "image"; // Added to support both videos and images
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
