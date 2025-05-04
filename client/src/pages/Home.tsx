import { useState } from "react";
import { useLocation } from "wouter";
import CategoryNavigation from "@/components/CategoryNavigation";
import VideoPlayer from "@/components/VideoPlayer";
import ContentFeed from "@/components/ContentFeed";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Category } from "@shared/schema";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("");
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
  
  // Use only standard categories from the API
  const allCategories = apiCategories || [];

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
    
    // Provide user feedback when changing categories
    if (slug) {
      const categoryName = allCategories.find(cat => cat.slug === slug)?.name || '';
      toast({
        title: `${categoryName} Selected`,
        description: `Showing ${categoryName} content`,
        duration: 2000,
      });
    } else {
      toast({
        title: "All Categories",
        description: "Showing content from all categories",
        duration: 2000,
      });
    }
  };
  
  // Handle player functionality
  const closePlayer = () => {
    setIsPlayerOpen(false);
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
        </div>
      )}

      <div id="homePage" className="page active">
        <main className="container mx-auto px-4 py-4 pb-12">
        {/* Added padding to bottom (pb-12) to make room for the fixed mini footer */}
          
          {/* Content Feed with three sections - now the first element */}
          <ContentFeed categorySlug={activeCategory} />
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