import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import CategoryNavigation from "@/components/CategoryNavigation";
import Footer from "@/components/Footer";
import VideoPlayer from "@/components/VideoPlayer";
import InfiniteContentFeed from "@/components/InfiniteContentFeed";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Categories } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { LogIn, Upload, Video, WandSparkles } from "lucide-react";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("trending");
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [selectedVideoId, setSelectedVideoId] = useState<number | undefined>(undefined);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
  };

  const handlePreview = (videoId: number) => {
    // When explicitly clicked, open the modal player
    setSelectedVideoId(videoId);
    setIsPlayerOpen(true);
    
    // Only show toast notification if this is the first preview or on click
    const videoElement = document.getElementById(`video-preview-${videoId}`);
    if (!videoElement) {
      toast({
        title: "Preview Started",
        description: `Previewing content ID: ${videoId}`,
        duration: 2000,
      });
    }
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

  return (
    <>
      {user ? (
        <Header />
      ) : (
        <div className="bg-secondary px-4 py-3 shadow-md">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-primary font-bold text-2xl">DeepTube<span className="text-xs align-top">.co</span></h1>
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
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
      )}
      
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
        <CategoryNavigation 
          categories={Categories} 
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange} 
        />
        
        {/* Infinite Content Feed with Video-Image alternating pattern */}
        <InfiniteContentFeed 
          onPreview={handlePreview}
          onWishlist={handleWishlist}
        />
      </main>
      
      <Footer />
      
      {/* Video Player Modal */}
      <VideoPlayer 
        videoId={selectedVideoId} 
        isOpen={isPlayerOpen} 
        onClose={closePlayer} 
      />
    </>
  );
}