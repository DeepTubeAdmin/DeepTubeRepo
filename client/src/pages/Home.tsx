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

export default function Home() {
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
    // In a real app, this would call our API to update user credits
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
            <h1 className="text-primary font-bold text-2xl">AIVideoHub</h1>
            <div className="flex items-center space-x-3">
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
        
        <CtaBanner />
        
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">Popular Categories</h2>
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
