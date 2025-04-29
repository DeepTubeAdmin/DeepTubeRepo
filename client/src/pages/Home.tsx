import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import CategoryNavigation from "@/components/CategoryNavigation";
import VideoPlayer from "@/components/VideoPlayer";
import InfiniteContentFeed from "@/components/InfiniteContentFeed";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { LogIn, Upload, Video, WandSparkles, Filter } from "lucide-react";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("trending");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'viewed'>('newest');
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
  
  const handleSortChange = (sortOption: 'newest' | 'oldest' | 'viewed') => {
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
      {!isCategoriesLoading && (
        <CategoryNavigation 
          categories={allCategories} 
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange} 
        />
      )}

      <div id="homePage" className="page active">
        <main className="container mx-auto px-4 py-4">
          {/* Featured Section */}
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="col-span-full lg:col-span-2 video-card video-item" data-id="featured-1" data-type="video" onClick={() => handlePreview(49)}>
                <div className="thumbnail-container">
                  <div className="bg-gray-800 thumbnail flex items-center justify-center">
                    <img src="https://i.vimeocdn.com/video/1729347065-e1ed63828a4185f9f8f381e05199a18b80053c935f292a4b?mw=1000&mh=562" alt="Featured Video" className="thumbnail" />
                  </div>
                  <video muted loop className="absolute top-0 left-0 w-full h-full object-cover opacity-0 hover:opacity-100 transition-opacity">
                    <source src="https://player.vimeo.com/progressive_redirect/playback/916033253/rendition/720p/file.mp4?loc=external" type="video/mp4" />
                  </video>
                  <div className="duration">2:18</div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-lg truncate">AI Generated Nature Documentary with David Attenborough Voice</h3>
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>DeepLearning Studio</span>
                    <div>
                      <span className="mr-2"><i className="fas fa-eye mr-1"></i>1.2M</span>
                      <span><i className="fas fa-thumbs-up mr-1"></i>95%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="video-card video-item" data-id="featured-2" data-type="video" onClick={() => handlePreview(48)}>
                <div className="thumbnail-container">
                  <div className="bg-gray-800 thumbnail flex items-center justify-center">
                    <img src="https://img.youtube.com/vi/t_Qn2B40zsM/mqdefault.jpg" alt="Featured Video" className="thumbnail" />
                  </div>
                  <video muted loop className="absolute top-0 left-0 w-full h-full object-cover opacity-0 hover:opacity-100 transition-opacity">
                    <source src="https://www.youtube.com/embed/t_Qn2B40zsM" type="video/mp4" />
                  </video>
                  <div className="duration">5:30</div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium truncate">Photorealistic AI Portrait Creation Tutorial</h3>
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>AI Artist</span>
                    <div>
                      <span className="mr-2"><i className="fas fa-eye mr-1"></i>845K</span>
                      <span><i className="fas fa-thumbs-up mr-1"></i>98%</span>
                    </div>
                  </div>
                </div>
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
    </Layout>
  );
}