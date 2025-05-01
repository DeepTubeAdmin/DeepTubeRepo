import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import CategoryNavigation from "@/components/CategoryNavigation";
import VideoPlayer from "@/components/VideoPlayer";
import VideoCard from "@/components/VideoCard";
import InfiniteContentFeed from "@/components/InfiniteContentFeed";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Category, Video } from "@/types";
import { Button } from "@/components/ui/button";
import { LogIn, Upload, WandSparkles, Filter } from "lucide-react";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("trending");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-viewed' | 'trending' | 'popular'>('newest');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [selectedVideoId, setSelectedVideoId] = useState<number | undefined>(undefined);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Fetch categories from API
  const { data: apiCategories, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  
  // Add trending and most viewed to categories
  const allCategories = [
    { id: 0, name: "Trending", slug: "trending", icon: "🔥" },
    { id: 0, name: "Most Viewed", slug: "most-viewed", icon: "👁️" },
    ...(apiCategories || [])
  ];

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
  };
  
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  
  const toggleFilterMenu = () => {
    setShowFilterMenu(!showFilterMenu);
  };
  
  const handleSortChange = (sortOption: 'newest' | 'oldest' | 'most-viewed' | 'trending' | 'popular') => {
    setSortBy(sortOption);
    setShowFilterMenu(false);
  };
  
  // Handle clicks outside of the filter menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilterMenu && 
        filterMenuRef.current && 
        filterButtonRef.current && 
        !filterMenuRef.current.contains(event.target as Node) &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilterMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

  const handlePreview = (videoId: number) => {
    setSelectedVideoId(videoId);
    setIsPlayerOpen(true);
  };

  const handleWishlist = (videoId: number) => {
    toast({
      title: "Added to Wishlist",
      description: `Video ID: ${videoId} has been added to your wishlist.`,
    });
  };

  const navigateToAuth = () => {
    setLocation("/auth");
  };

  const closePlayer = () => {
    setIsPlayerOpen(false);
  };
  
  const handleUploadClick = () => {
    // For non-authenticated users, show login modal
    if (!user) {
      setIsLoginModalOpen(true);
    }
  };

  return (
    <Layout showHeader={true}>
      <SEO 
        title="DeepTube: Ethical AI Media Hub"
        description="DeepTube.co: Where innovative creators share responsible AI-powered media. Host, view, and explore trusted video content!"
        keywords="AI media hosting, Responsible AI media, Video hosting platform, DeepTube, AI-powered video, Trusted video content, Creator media platform, AI content sharing"
        isHome={true} 
      />
      {!isCategoriesLoading && (
        <div className="relative">
          <CategoryNavigation 
            categories={allCategories} 
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange} 
          />
          
          {/* Sort dropdown UI */}
          <div className="absolute right-6 top-2.5 z-50">
            <button 
              ref={filterButtonRef}
              onClick={toggleFilterMenu}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white text-sm border border-gray-700"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Sort</span>
            </button>
            
            {showFilterMenu && (
              <div 
                ref={filterMenuRef}
                className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-black border border-gray-700 ring-1 ring-black ring-opacity-5 z-50"
              >
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    className={`${sortBy === 'newest' ? 'bg-gray-800 text-primary' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('newest')}
                    role="menuitem"
                  >
                    Newest First
                  </button>
                  <button
                    className={`${sortBy === 'oldest' ? 'bg-gray-800 text-primary' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('oldest')}
                    role="menuitem"
                  >
                    Oldest First
                  </button>
                  <button
                    className={`${sortBy === 'most-viewed' ? 'bg-gray-800 text-primary' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('most-viewed')}
                    role="menuitem"
                  >
                    Most Viewed
                  </button>
                  <button
                    className={`${sortBy === 'trending' ? 'bg-gray-800 text-primary' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('trending')}
                    role="menuitem"
                  >
                    Trending
                  </button>
                  <button
                    className={`${sortBy === 'popular' ? 'bg-gray-800 text-primary' : 'text-white'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange('popular')}
                    role="menuitem"
                  >
                    Popular
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div id="homePage" className="page active">
        <main className="container mx-auto px-4 py-4 pb-12">
        {/* Added padding to bottom (pb-12) to make room for the fixed mini footer */}
          {/* Featured Section */}
          <section className="mb-8">
            <h3 className="text-2xl font-bold mb-6">Featured Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="col-span-full lg:col-span-2">
                <VideoCard 
                  video={{
                    id: 49,
                    title: "AI Generated Nature Documentary with David Attenborough Voice",
                    thumbnail: "https://i.vimeocdn.com/video/1729347065-e1ed63828a4185f9f8f381e05199a18b80053c935f292a4b?mw=1000&mh=562",
                    videoUrl: "https://player.vimeo.com/progressive_redirect/playback/916033253/rendition/720p/file.mp4?loc=external",
                    contentType: "video",
                    duration: 138,
                    aiGenerator: "DeepLearning Studio",
                    resolution: "4K",
                    credits: 0,
                    categoryId: 3,
                    userId: 1,
                    createdAt: new Date().toISOString()
                  }}
                  onPreview={handlePreview}
                  onWishlist={handleWishlist}
                />
              </div>
              
              <div>
                <VideoCard 
                  video={{
                    id: 48,
                    title: "Photorealistic AI Portrait Creation Tutorial",
                    thumbnail: "https://img.youtube.com/vi/t_Qn2B40zsM/mqdefault.jpg",
                    embedCode: `<iframe width="560" height="315" src="https://www.youtube.com/embed/t_Qn2B40zsM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
                    contentType: "embed",
                    duration: 330,
                    aiGenerator: "AI Artist",
                    resolution: "4K",
                    credits: 0,
                    categoryId: 3,
                    userId: 1,
                    createdAt: new Date().toISOString()
                  }}
                  onPreview={handlePreview}
                  onWishlist={handleWishlist}
                />
              </div>
            </div>
          </section>

          {/* Affiliate Banner */}
          <section className="affiliate-banner p-4 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-bold mb-1">Create Your Own AI Content</h3>
                <p className="text-gray-300">Generate professional videos with AI avatars - no camera or microphone needed</p>
              </div>
              <Button
                className="upload-btn py-2 px-6 rounded-full text-white font-medium"
                onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
              >
                <WandSparkles className="mr-2 h-4 w-4" />
                Try Synthesia
              </Button>
            </div>
          </section>
          
          {/* Infinite Content Feed with Video-Image alternating pattern */}
          <InfiniteContentFeed 
            onPreview={handlePreview}
            onWishlist={handleWishlist}
            category={activeCategory}
            sortBy={sortBy}
          />
        </main>
      </div>
      
      {/* Video Player Modal */}
      <VideoPlayer 
        videoId={selectedVideoId} 
        isOpen={isPlayerOpen} 
        onClose={closePlayer} 
      />
      
      {/* Login Required Modal */}
      <LoginRequiredModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
      
      {/* Mini Footer - only visible on home page */}
      <MiniFooter />
    </Layout>
  );
}