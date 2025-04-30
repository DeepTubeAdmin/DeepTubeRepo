import { Video, Category, PopularCategory } from "@/types";

export const Categories: Category[] = [
  {
    id: 1,
    name: "Trending",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
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
    name: "Entertainment",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
    slug: "entertainment"
  },
  {
    id: 4,
    name: "Marketing",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>',
    slug: "marketing"
  },
  {
    id: 5,
    name: "Characters",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    slug: "characters"
  },
  {
    id: 6,
    name: "Editing",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
    slug: "editing"
  },
  {
    id: 7,
    name: "Art",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>',
    slug: "art"
  },
  {
    id: 8,
    name: "Design",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    slug: "design"
  },
  {
    id: 11,
    name: "Social Media",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
    slug: "social-media"
  },
  {
    id: 12,
    name: "Business",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    slug: "business"
  },
  {
    id: 13,
    name: "Nature",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V9.76a2 2 0 0 1 .51-1.33L12 3l5.49 5.43a2 2 0 0 1 .51 1.33V22"></path><path d="M2 22h20"></path></svg>',
    slug: "nature"
  },
  {
    id: 14,
    name: "Fashion",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>',
    slug: "fashion"
  },
  {
    id: 15,
    name: "Education",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
    slug: "education"
  },
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
    category: "entertainment",
    contentType: "video"
  },
  {
    id: 3,
    title: "Abstract Pattern Flow",
    thumbnail: "https://images.pexels.com/photos/1762851/pexels-photo-1762851.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 350,
    resolution: "HD",
    duration: 10,
    category: "art",
    contentType: "video"
  },
  {
    id: 4,
    title: "Portrait Animation Deluxe",
    thumbnail: "https://images.pexels.com/photos/1144687/pexels-photo-1144687.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 1200,
    resolution: "4K",
    duration: 45,
    category: "characters",
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
    category: "design",
    contentType: "image"
  },
  {
    id: 102,
    title: "Surreal Landscape Fantasy",
    thumbnail: "https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 300,
    resolution: "4K",
    duration: 0,
    category: "art",
    contentType: "image"
  },
  {
    id: 103,
    title: "Abstract Dreamscape Patterns",
    thumbnail: "https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 200,
    resolution: "HD",
    duration: 0,
    category: "art",
    contentType: "image"
  },
  {
    id: 104,
    title: "Digital Portrait Composition",
    thumbnail: "https://images.pexels.com/photos/954557/pexels-photo-954557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 350,
    resolution: "4K",
    duration: 0,
    category: "characters",
    contentType: "image"
  },
  {
    id: 105,
    title: "Cosmic Nebula Exploration",
    thumbnail: "https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 275,
    resolution: "4K",
    duration: 0,
    category: "entertainment",
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
    category: "entertainment",
    contentType: "video"
  },
  {
    id: 8,
    title: "Abstract Light Particles",
    thumbnail: "https://images.pexels.com/photos/1998479/pexels-photo-1998479.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    credits: 300,
    resolution: "HD",
    duration: 15,
    category: "art",
    contentType: "video"
  }
];

export const PopularCategories: PopularCategory[] = [
  {
    id: 1,
    name: "Characters",
    image: "https://images.pexels.com/photos/1693095/pexels-photo-1693095.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    count: 542
  },
  {
    id: 2,
    name: "Nature",
    image: "https://images.pexels.com/photos/924824/pexels-photo-924824.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    count: 321
  },
  {
    id: 3,
    name: "Art",
    image: "https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    count: 289
  },
  {
    id: 4,
    name: "Entertainment",
    image: "https://images.pexels.com/photos/127513/pexels-photo-127513.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    count: 456
  }
];