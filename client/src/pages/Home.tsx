import { useState } from "react";
import Header from "@/components/Header";
import CategoryNavigation from "@/components/CategoryNavigation";
import VideoGrid from "@/components/VideoGrid";
import CtaBanner from "@/components/CtaBanner";
import CategoryCard from "@/components/CategoryCard";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Categories, FeaturedVideos, NewReleases, PopularCategories } from "@/data/mockData";

export default function Home() {
  const [credits, setCredits] = useState<number>(2500);
  const [activeCategory, setActiveCategory] = useState<string>("trending");
  const { toast } = useToast();

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
    setCredits(credits + amount);
    toast({
      title: "Credits Purchased!",
      description: `${amount.toLocaleString()} credits have been added to your account.`,
      variant: "success",
    });
  };

  return (
    <>
      <Header credits={credits} onCreditPurchase={handleCreditPurchase} />
      
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
