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
    name: "Most Viewed",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    slug: "most-viewed"
  },
  {
    id: 3,
    name: "Sci-Fi",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3a8 8 0 0 1 11.67 9H21v4h-6.96a8 8 0 0 1-10.41 2.29"/><line x1="6" x2="6" y1="16" y2="20"/><line x1="10" x2="10" y1="16" y2="20"/><line x1="14" x2="14" y1="16" y2="20"/></svg>',
    slug: "sci-fi"
  },
  {
    id: 4,
    name: "Comedy",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>',
    slug: "comedy"
  },
  {
    id: 5,
    name: "Animation",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.82 2H4.18A2.18 2.18 0 0 0 2 4.18v15.64A2.18 2.18 0 0 0 4.18 22h15.64A2.18 2.18 0 0 0 22 19.82V4.18A2.18 2.18 0 0 0 19.82 2Z"/><path d="M7 2v20"/><path d="M17 2v20"/><path d="M2 12h20"/><path d="M2 7h5"/><path d="M2 17h5"/><path d="M17 17h5"/><path d="M17 7h5"/></svg>',
    slug: "animation"
  },
  {
    id: 6,
    name: "Nature",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14c.9-1 1.5-2.3 1.8-3.8.2-1.2-.1-2.3-.5-3.3-.5-1.6-1.9-2.7-3.5-3.4-2.3-.8-5-.6-7.1.8C5.4 5.5 4 7.7 3.6 10c-.4 1.5-.2 3 .4 4.4 1 2.2 3.2 3.6 5.6 3.6h.2"></path><path d="M17 14h-1.5c-1.1 0-2.5.2-3.5.9-.8.5-1.5 1.4-2 2.3-.4.8-.8 1.7-1 2.6"></path></svg>',
    slug: "nature"
  },
  {
    id: 7,
    name: "Horror",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1Z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/></svg>',
    slug: "horror"
  },
  {
    id: 8,
    name: "Romance",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    slug: "romance"
  },
  {
    id: 9,
    name: "Action",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    slug: "action"
  },
  {
    id: 10,
    name: "Surreal",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16.2A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><path d="M13 13v4"/><path d="M17 13v4"/></svg>',
    slug: "surreal"
  },
  {
    id: 11,
    name: "Historical",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    slug: "historical"
  },
  {
    id: 12,
    name: "Kids",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1s.4-1 1-1 1 .4 1 1"/></svg>',
    slug: "kids"
  },
  {
    id: 13,
    name: "People",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    slug: "people"
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
    category: "urban",
    contentType: "video"
  },
  {
    id: 2,
    title: "Cosmic Voyage Experience",
    thumbnail: "https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 750,
    resolution: "4K",
    duration: 30,
    category: "sci-fi",
    contentType: "video"
  },
  {
    id: 3,
    title: "Abstract Pattern Flow",
    thumbnail: "https://images.pexels.com/photos/1762851/pexels-photo-1762851.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 350,
    resolution: "HD",
    duration: 10,
    category: "style-transfer",
    contentType: "video"
  },
  {
    id: 4,
    title: "Portrait Animation Deluxe",
    thumbnail: "https://images.pexels.com/photos/1144687/pexels-photo-1144687.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 1200,
    resolution: "4K",
    duration: 45,
    category: "portrait-animations",
    contentType: "video"
  }
];

export const AIGeneratedImages: Video[] = [
  {
    id: 101,
    title: "Neon Cityscape at Dusk",
    thumbnail: "https://images.pexels.com/photos/6444367/pexels-photo-6444367.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 250,
    resolution: "4K",
    duration: 0,
    category: "urban",
    contentType: "image"
  },
  {
    id: 102,
    title: "Surreal Landscape Fantasy",
    thumbnail: "https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 300,
    resolution: "4K",
    duration: 0,
    category: "surreal",
    contentType: "image"
  },
  {
    id: 103,
    title: "Abstract Dreamscape Patterns",
    thumbnail: "https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 200,
    resolution: "HD",
    duration: 0,
    category: "abstract",
    contentType: "image"
  },
  {
    id: 104,
    title: "Digital Portrait Composition",
    thumbnail: "https://images.pexels.com/photos/954557/pexels-photo-954557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 350,
    resolution: "4K",
    duration: 0,
    category: "portrait",
    contentType: "image"
  },
  {
    id: 105,
    title: "Cosmic Nebula Exploration",
    thumbnail: "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 275,
    resolution: "4K",
    duration: 0,
    category: "sci-fi",
    contentType: "image"
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
    category: "nature",
    contentType: "video"
  },
  {
    id: 6,
    title: "Ocean Meditation Waves",
    thumbnail: "https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 450,
    resolution: "HD",
    duration: 60,
    category: "nature",
    contentType: "video"
  },
  {
    id: 7,
    title: "Cyberpunk City Flythrough",
    thumbnail: "https://images.pexels.com/photos/3075993/pexels-photo-3075993.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 850,
    resolution: "4K",
    duration: 25,
    category: "urban",
    contentType: "video"
  },
  {
    id: 8,
    title: "Abstract Light Particles",
    thumbnail: "https://images.pexels.com/photos/1998479/pexels-photo-1998479.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 300,
    resolution: "HD",
    duration: 15,
    category: "style-transfer",
    contentType: "video"
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
