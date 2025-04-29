import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Video } from "@shared/schema";
import Layout from "@/components/Layout";
import VideoGrid from "@/components/VideoGrid";
import ImageGallery from "@/components/ImageGallery";
import CategoryNavigation from "@/components/CategoryNavigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function SearchResults() {
  const [location] = useLocation();
  const query = new URLSearchParams(location.split("?")[1]).get("q") || "";
  const [activeTab, setActiveTab] = useState<"all" | "videos" | "images" | "forum">("all");
  const [activeCategory, setActiveCategory] = useState<string>("");

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: searchResults, isLoading: resultsLoading } = useQuery<{
    videos: Video[],
    images: Video[],
    forum: any[] // We'll type this better when we have forum post types
  }>({
    queryKey: ['/api/search', query, activeCategory],
    enabled: !!query,
  });

  // Handle category change
  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug === activeCategory ? "" : slug);
  };

  // Handle preview redirects to detail pages
  const handleVideoPreview = (videoId: number) => {
    window.location.href = `/media/${videoId}`;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold mr-4">
            Search Results for: <span className="text-primary">{query}</span>
          </h1>
          <div className="relative flex-1 max-w-md ml-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <form action="/search" method="get">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search videos, images, or forum posts..."
                className="pl-10 pr-4 py-2 w-full bg-[#121212] border border-[#303030] rounded-full focus:outline-none focus:border-primary"
              />
            </form>
          </div>
        </div>

        <CategoryNavigation 
          categories={categories} 
          activeCategory={activeCategory} 
          onCategoryChange={handleCategoryChange} 
        />

        <div className="mb-6 mt-4 flex space-x-2 overflow-x-auto scrollbar-none">
          <Button 
            variant={activeTab === "all" ? "default" : "outline"} 
            onClick={() => setActiveTab("all")}
            className={activeTab === "all" ? "bg-primary text-black font-bold" : "bg-[#272727] border-none text-white"}
          >
            All Results
          </Button>
          <Button 
            variant={activeTab === "videos" ? "default" : "outline"} 
            onClick={() => setActiveTab("videos")}
            className={activeTab === "videos" ? "bg-primary text-black font-bold" : "bg-[#272727] border-none text-white"}
          >
            Videos
          </Button>
          <Button 
            variant={activeTab === "images" ? "default" : "outline"} 
            onClick={() => setActiveTab("images")}
            className={activeTab === "images" ? "bg-primary text-black font-bold" : "bg-[#272727] border-none text-white"}
          >
            Images
          </Button>
          <Button 
            variant={activeTab === "forum" ? "default" : "outline"} 
            onClick={() => setActiveTab("forum")}
            className={activeTab === "forum" ? "bg-primary text-black font-bold" : "bg-[#272727] border-none text-white"}
          >
            Forum Posts
          </Button>
        </div>

        {resultsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="loading-spinner"></div>
          </div>
        ) : !searchResults ? (
          <div className="text-center py-12 bg-[#1a1a1a] rounded-lg">
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-gray-400">Try a different search term or browse content by category</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* All results or Videos tab */}
            {(activeTab === "all" || activeTab === "videos") && searchResults.videos.length > 0 && (
              <VideoGrid 
                title="Videos" 
                videos={searchResults.videos}
                onPreview={handleVideoPreview}
                showViewAll={false}
              />
            )}

            {/* All results or Images tab */}
            {(activeTab === "all" || activeTab === "images") && searchResults.images.length > 0 && (
              <ImageGallery 
                title="Images" 
                images={searchResults.images}
                onPreview={handleVideoPreview}
                showViewAll={false}
              />
            )}

            {/* All results or Forum tab */}
            {(activeTab === "all" || activeTab === "forum") && searchResults.forum && searchResults.forum.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Forum Posts</h2>
                <div className="forum-category">
                  <div className="forum-category-header flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Discussions</h3>
                    <span className="text-sm text-gray-400">{searchResults.forum.length} results</span>
                  </div>
                  
                  {searchResults.forum.map((post: any) => (
                    <div key={post.id} className="forum-topic">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-semibold hover:text-primary">
                            <a href={`/forum/post/${post.id}`}>{post.title}</a>
                          </h4>
                          <div className="text-sm text-gray-400 mt-1">
                            Posted by {post.author.username || 'Anonymous'} • {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          <span className="mr-3">{post.replies || 0} replies</span>
                          <span>{post.views || 0} views</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results for specific sections */}
            {activeTab === "videos" && (!searchResults.videos || searchResults.videos.length === 0) && (
              <div className="text-center py-8 bg-[#1a1a1a] rounded-lg">
                <h3 className="text-lg font-semibold mb-2">No videos found</h3>
                <p className="text-gray-400">Try a different search term or browse videos by category</p>
              </div>
            )}

            {activeTab === "images" && (!searchResults.images || searchResults.images.length === 0) && (
              <div className="text-center py-8 bg-[#1a1a1a] rounded-lg">
                <h3 className="text-lg font-semibold mb-2">No images found</h3>
                <p className="text-gray-400">Try a different search term or browse images by category</p>
              </div>
            )}

            {activeTab === "forum" && (!searchResults.forum || searchResults.forum.length === 0) && (
              <div className="text-center py-8 bg-[#1a1a1a] rounded-lg">
                <h3 className="text-lg font-semibold mb-2">No forum posts found</h3>
                <p className="text-gray-400">Try a different search term or browse discussions in the forum</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}