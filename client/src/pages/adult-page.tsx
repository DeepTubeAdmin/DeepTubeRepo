import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import CategoryNavigation from "@/components/CategoryNavigation";
import VideoGrid from "@/components/VideoGrid";
import CtaBanner from "@/components/CtaBanner";
import CategoryCard from "@/components/CategoryCard";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Categories, FeaturedVideos, NewReleases, PopularCategories } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function AdultPage() {
  const [activeCategory, setActiveCategory] = useState<string>("trending");
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
  };

  const handlePreview = (videoId: number) => {
    toast({
      title: "Video Preview",
      description: `Preview functionality will be implemented for video ID: ${videoId}`,
    });
  };

  const handleWishlist = (videoId: number) => {
    toast({
      title: "Added to Wishlist",
      description: `Video ID: ${videoId} has been added to your wishlist.`,
    });
  };

  const handleCreditPurchase = (amount: number) => {
    toast({
      title: "Credits Purchased!",
      description: `${amount.toLocaleString()} credits have been added to your account.`,
    });
  };

  const navigateToAuth = () => {
    setLocation("/auth");
  };

  return (
    <>
      {user ? (
        <Header credits={user.credits} onCreditPurchase={handleCreditPurchase} />
      ) : (
        <div className="bg-secondary px-4 py-3 shadow-md">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-primary font-bold text-2xl">Deep-Tube <span className="text-red-500">Adult</span></h1>
            <div className="flex items-center space-x-3">
              <Button onClick={() => setLocation("/")} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                Regular Content
              </Button>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Video
              </Button>
              <Button onClick={navigateToAuth} className="bg-primary">
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-red-500/10 border-y border-red-500/20 py-3">
        <div className="container mx-auto px-4">
          <p className="text-center text-red-600 font-medium">
            Warning: This page contains adult content. By continuing, you confirm you are 18+ years old.
          </p>
        </div>
      </div>
      
      <main className="container mx-auto px-4 py-5">
        <CategoryNavigation 
          categories={Categories} 
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange} 
        />
        
        <VideoGrid
          title="Featured Adult AI Videos"
          videos={FeaturedVideos}
          onPreview={handlePreview}
          onWishlist={handleWishlist}
        />
        
        <VideoGrid
          title="New Adult Releases"
          videos={NewReleases}
          onPreview={handlePreview}
          onWishlist={handleWishlist}
        />
        
        <section className="mb-8 mt-8">
          <div className="bg-card rounded-xl p-6 md:p-8 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 md:mr-6 z-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Create Your Own Adult AI Content
                </h2>
                <p className="text-muted-foreground mb-4 max-w-lg">
                  Generate personalized adult videos with our advanced AI. 
                  Customize characters, scenarios, and more to your preferences.
                </p>
                <Button className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full">
                  Start Creating
                </Button>
              </div>
              <div className="w-full md:w-2/5 z-10">
                <div className="aspect-video bg-background rounded-lg overflow-hidden shadow-lg">
                  <div className="w-full h-full bg-black/10 flex items-center justify-center text-red-500 font-medium">
                    18+ Preview Available After Login
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-500 opacity-10 rounded-full"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-red-500 opacity-10 rounded-full"></div>
            </div>
          </div>
        </section>
        
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">Popular Adult Categories</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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