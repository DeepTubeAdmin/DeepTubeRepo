import { useState, useEffect } from "react";
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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
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
  
  const toggleFilterMenu = () => {
    setShowFilterMenu(!showFilterMenu);
  };
  
  const handleSortChange = (sortOption: 'newest' | 'oldest') => {
    setSortBy(sortOption);
    setShowFilterMenu(false);
  };

  const handlePreview = (videoId: number) => {
    // Only open the modal player when explicitly clicked, not on hover
    console.log("Home: handlePreview called with videoId:", videoId);
    setSelectedVideoId(videoId);
    console.log("Home: Setting isPlayerOpen to true");
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

  // Custom header for non-authenticated users
  const renderGuestHeader = () => {
    return (
      <div className="bg-secondary px-4 py-3 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-primary font-bold text-2xl">DeepTube<span className="text-xs align-top">.co</span></h1>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary/10"
              onClick={handleUploadClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Media
            </Button>
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary/10"
              onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
            >
              <WandSparkles className="mr-2 h-4 w-4" />
              Create
            </Button>
            <Button onClick={navigateToAuth} className="bg-primary">
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout showHeader={user ? true : false}>
      {!user && renderGuestHeader()}
      
      {/* AI Video Creation Banner */}
      <div className="bg-primary/5 border-y border-primary/20">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <Video className="h-8 w-8 text-primary mr-3" />
            <div>
              <h3 className="font-bold text-lg text-primary">Create AI Videos with Synthesia</h3>
              <p className="text-sm text-muted-foreground">Generate professional AI videos in minutes without cameras or actors</p>
            </div>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
          >
            <WandSparkles className="mr-2 h-4 w-4" />
            Try Synthesia
          </Button>
        </div>
      </div>
      
      <main className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-grow overflow-x-auto">
            {!isCategoriesLoading && (
              <CategoryNavigation 
                categories={allCategories} 
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange} 
              />
            )}
          </div>
          
          <div className="relative ml-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center"
              onClick={toggleFilterMenu}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
            
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 rounded-md shadow-lg p-2 z-50 w-48 border dark:border-gray-800">
                <div className="text-sm font-medium mb-2 px-2">Sort by</div>
                <Button
                  variant={sortBy === 'newest' ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleSortChange('newest')}
                >
                  Newest First
                </Button>
                <Button
                  variant={sortBy === 'oldest' ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleSortChange('oldest')}
                >
                  Oldest First
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Infinite Content Feed with Video-Image alternating pattern */}
        <InfiniteContentFeed 
          onPreview={handlePreview}
          onWishlist={handleWishlist}
          category={activeCategory}
          sortBy={sortBy}
        />
      </main>
      
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