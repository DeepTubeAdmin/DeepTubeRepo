import { Video, Category, PopularCategory } from "@/types";

export const Categories: Category[] = [
  {
    id: 1,
    name: "Trending",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    slug: "trending"
  },
  {
    id: 2,
    name: "Style Transfer",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/></svg>',
    slug: "style-transfer"
  },
  {
    id: 3,
    name: "Portrait Animations",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>',
    slug: "portrait-animations"
  },
  {
    id: 4,
    name: "Cinematic",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    slug: "cinematic"
  },
  {
    id: 5,
    name: "Sci-Fi",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3a8 8 0 0 1 11.67 9H21v4h-6.96a8 8 0 0 1-10.41 2.29"/><line x1="6" x2="6" y1="16" y2="20"/><line x1="10" x2="10" y1="16" y2="20"/><line x1="14" x2="14" y1="16" y2="20"/></svg>',
    slug: "sci-fi"
  },
  {
    id: 6,
    name: "Nature",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14c.9-1 1.5-2.3 1.8-3.8.2-1.2-.1-2.3-.5-3.3-.5-1.6-1.9-2.7-3.5-3.4-2.3-.8-5-.6-7.1.8C5.4 5.5 4 7.7 3.6 10c-.4 1.5-.2 3 .4 4.4 1 2.2 3.2 3.6 5.6 3.6h.2"></path><path d="M17 14h-1.5c-1.1 0-2.5.2-3.5.9-.8.5-1.5 1.4-2 2.3-.4.8-.8 1.7-1 2.6"></path></svg>',
    slug: "nature"
  },
  {
    id: 7,
    name: "Urban",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14"/><path d="M9 8v6"/><path d="M15 8v6"/><path d="M17 16h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2"/><path d="M7 16H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2"/></svg>',
    slug: "urban"
  },
  {
    id: 8,
    name: "Premium",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    slug: "premium"
  }
];

export const FeaturedVideos: Video[] = [
  {
    id: 1,
    title: "Futuristic Cityscape Generator",
    thumbnail: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 500,
    resolution: "4K",
    duration: 15,
    category: "urban"
  },
  {
    id: 2,
    title: "Cosmic Voyage Experience",
    thumbnail: "https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 750,
    resolution: "4K",
    duration: 30,
    category: "sci-fi"
  },
  {
    id: 3,
    title: "Abstract Pattern Flow",
    thumbnail: "https://images.pexels.com/photos/1762851/pexels-photo-1762851.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 350,
    resolution: "HD",
    duration: 10,
    category: "style-transfer"
  },
  {
    id: 4,
    title: "Portrait Animation Deluxe",
    thumbnail: "https://images.pexels.com/photos/1144687/pexels-photo-1144687.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 1200,
    resolution: "4K",
    duration: 45,
    category: "portrait-animations"
  }
];

export const NewReleases: Video[] = [
  {
    id: 5,
    title: "Nature Morphing Experience",
    thumbnail: "https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 600,
    resolution: "4K",
    duration: 20,
    category: "nature"
  },
  {
    id: 6,
    title: "Ocean Meditation Waves",
    thumbnail: "https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 450,
    resolution: "HD",
    duration: 60,
    category: "nature"
  },
  {
    id: 7,
    title: "Cyberpunk City Flythrough",
    thumbnail: "https://images.pexels.com/photos/3075993/pexels-photo-3075993.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 850,
    resolution: "4K",
    duration: 25,
    category: "urban"
  },
  {
    id: 8,
    title: "Abstract Light Particles",
    thumbnail: "https://images.pexels.com/photos/1998479/pexels-photo-1998479.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 300,
    resolution: "HD",
    duration: 15,
    category: "style-transfer"
  }
];

export const PopularCategories: PopularCategory[] = [
  {
    id: 1,
    name: "Portraits",
    image: "https://images.pexels.com/photos/1693095/pexels-photo-1693095.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    count: 542
  },
  {
    id: 2,
    name: "Landscapes",
    image: "https://images.pexels.com/photos/924824/pexels-photo-924824.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    count: 321
  },
  {
    id: 3,
    name: "Abstract",
    image: "https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    count: 289
  },
  {
    id: 4,
    name: "Sci-Fi",
    image: "https://images.pexels.com/photos/127513/pexels-photo-127513.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    count: 456
  }
];
