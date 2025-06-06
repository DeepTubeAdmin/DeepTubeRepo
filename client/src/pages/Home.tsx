import { useState, useEffect } from "react";
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
import { queryClient } from "@/lib/queryClient";
import { useShuffle } from "@/App";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [selectedVideoId, setSelectedVideoId] = useState<number | undefined>(undefined);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Get shuffle functionality from context
  const { triggerShuffle } = useShuffle();
  
  // Effect to trigger shuffle on component mount based on URL parameters
  useEffect(() => {
    // Check if we came from a shuffle (URL parameter) or if there's a shuffleSeed parameter
    const urlParams = new URLSearchParams(window.location.search);
    const hasShuffleParam = urlParams.has('shuffle');
    const hasShuffleSeedParam = urlParams.has('shuffleSeed');
    
    // Only do an auto-shuffle if we don't already have any shuffle params
    // This prevents infinite loops of shuffling
    if (!hasShuffleParam && !hasShuffleSeedParam) {
      // Generate a random number to decide whether to shuffle
      // Lower probability (30%) to reduce frequency of auto-shuffles
      const shouldAutoShuffle = Math.random() > 0.7;
      
      if (shouldAutoShuffle) {
        console.log('Home component: Auto-triggering content shuffle on page load');
        // Add a small delay to let other initialization complete first
        const timer = setTimeout(() => {
          triggerShuffle();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    } else {
      console.log('Home component: Detected shuffle param in URL, skipping auto-shuffle');
    }
  }, [triggerShuffle]);
  
  // Fetch categories from API
  const { data: apiCategories, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  
  // Use only standard categories from the API
  const allCategories = apiCategories || [];

  const handleCategoryChange = (slug: string) => {
    console.log(`Home: Changing category to: ${slug || 'all'}`);
    setActiveCategory(slug);
    
    // We don't need to explicitly invalidate here since the ContentFeed
    // component will handle that when it receives the new category prop
  };
  
  // Handle player functionality
  const closePlayer = () => {
    setIsPlayerOpen(false);
  };

  return (
    <Layout showHeader={true}>
      <SEO 
        title="DeepTube: Ethical AI Media Hub"
        description="DeepTubeAI.com: Where innovative creators share responsible AI-powered media. Host, view, and explore trusted video content!"
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