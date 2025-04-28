import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import CategoryNavigation from "@/components/CategoryNavigation";
import VideoGrid from "@/components/VideoGrid";
import ImageGallery from "@/components/ImageGallery";
import CategoryCard from "@/components/CategoryCard";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Categories, FeaturedVideos, NewReleases, PopularCategories, AIGeneratedImages } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { LogIn, Upload, Video, WandSparkles } from "lucide-react";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("trending");
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
  };

  const handlePreview = (videoId: number) => {
    // Only show toast notification if this is the first preview or on click
    // Avoid showing toast on every hover as that would be annoying
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

  return (
    <>
      {user ? (
        <Header />
      ) : (
        <div className="bg-secondary px-4 py-3 shadow-md">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-primary font-bold text-2xl">Deep-Tube</h1>
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
        
        <VideoGrid
          title="Featured AI Videos"
          videos={FeaturedVideos}
          onPreview={handlePreview}
          onWishlist={handleWishlist}
        />
        
        <VideoGrid
          title="New Releases"
          videos={NewReleases}
          onPreview={handlePreview}
          onWishlist={handleWishlist}
        />
        
        <ImageGallery
          title="AI-Generated Images"
          images={AIGeneratedImages}
          onPreview={handlePreview}
          onWishlist={handleWishlist}
        />
        
        <section className="mb-10">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-primary">Popular Categories</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {PopularCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      </main>
      
      <Footer />
    </>
  );
}