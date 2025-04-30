import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Layout from '@/components/Layout';
import VideoCard from '@/components/VideoCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CategoryNavigation from '@/components/CategoryNavigation';
import { Video, Category } from '@shared/schema';
import { Loader2 } from 'lucide-react';
import { getQueryFn } from '@/lib/queryClient';

export default function SearchResults() {
  const [location, setLocation] = useLocation();
  // Get the search params from the location
  const search = location.split('?')[1] || '';
  const searchParams = new URLSearchParams(search);
  
  // Get query parameters
  const initialQuery = searchParams.get('q') || '';
  const initialContentType = (searchParams.get('type') || 'all') as 'all' | 'video' | 'image' | 'embed';
  const initialCategorySlug = searchParams.get('category') || '';
  
  console.log('Search params directly from URL:', { 
    rawSearch: search,
    parsedQuery: searchParams.get('q'),
    initialQuery
  });
  
  // State for search filters
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [contentType, setContentType] = useState<'all' | 'video' | 'image' | 'embed'>(initialContentType);
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [previewVideoId, setPreviewVideoId] = useState<number | null>(null);
  
  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  
  // Update categoryId when slug or categories change
  useEffect(() => {
    if (categories && categorySlug) {
      const category = categories.find(c => c.slug === categorySlug);
      setCategoryId(category?.id);
    } else {
      setCategoryId(undefined);
    }
  }, [categorySlug, categories]);
  
  // Handle category change
  const handleCategoryChange = (slug: string) => {
    setCategorySlug(slug);
    
    // Update URL query parameters
    const params = new URLSearchParams(search);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    
    // Update the URL without reloading the page
    setLocation(`/search?${params.toString()}`, { replace: true });
  };
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update URL query parameters
    const params = new URLSearchParams(search);
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }
    
    // Update the URL without reloading the page
    setLocation(`/search?${params.toString()}`, { replace: true });
  };
  
  // Handle content type change
  const handleContentTypeChange = (value: string) => {
    const type = value as 'all' | 'video' | 'image' | 'embed';
    setContentType(type);
    
    // Update URL query parameters
    const params = new URLSearchParams(search);
    if (type !== 'all') {
      params.set('type', type);
    } else {
      params.delete('type');
    }
    
    // Update the URL without reloading the page
    setLocation(`/search?${params.toString()}`, { replace: true });
  };
  
  // Get the query directly from the URL every time to ensure it's accurate
  const getQueryDirectFromUrl = () => {
    const currentSearch = location.split('?')[1] || '';
    const currentParams = new URLSearchParams(currentSearch);
    return currentParams.get('q') || '';
  };
  
  const currentQuery = getQueryDirectFromUrl();
  
  // Construct the backend API URL with query parameters
  const constructSearchUrl = () => {
    // Always use the current URL query to ensure it's fresh
    let url = `/api/search?q=${encodeURIComponent(currentQuery)}`;
    
    if (initialContentType !== 'all') {
      url += `&type=${initialContentType}`;
    }
    
    if (categoryId) {
      url += `&categoryId=${categoryId}`;
    }
    
    return url;
  };
  
  const searchApiUrl = constructSearchUrl();
  
  console.log('Executing search query:', searchApiUrl, 'with current URL query:', currentQuery);
  
  // Listen for route changes and update state accordingly
  useEffect(() => {
    // When the location changes, update the search parameters
    const currentSearch = location.split('?')[1] || '';
    const currentParams = new URLSearchParams(currentSearch);
    
    const query = currentParams.get('q') || '';
    const type = (currentParams.get('type') || 'all') as 'all' | 'video' | 'image' | 'embed';
    const category = currentParams.get('category') || '';
    
    console.log('Route changed, updating search params:', { query, type, category });
    
    // Update the search state
    setSearchQuery(query);
    setContentType(type);
    setCategorySlug(category);
    
  }, [location]);
  
  const { data: searchResults, isLoading: searchLoading, error: searchError } = useQuery<Video[]>({
    queryKey: [searchApiUrl, location], // Include location in the query key to refetch when it changes
    queryFn: getQueryFn({
      on401: "returnNull"
    }),
    enabled: !!currentQuery, // Use currentQuery instead of initialQuery
  });
  
  // Log any search errors
  useEffect(() => {
    if (searchError) {
      console.error('Search error:', searchError);
    }
  }, [searchError]);
  
  // Handle preview click
  const handlePreview = (videoId: number) => {
    setPreviewVideoId(videoId);
  };
  
  // Handle wishlist click
  const handleWishlist = (videoId: number) => {
    // Implementation to add/remove from wishlist
    console.log('Add to wishlist:', videoId);
  };
  
  // Log search results for debugging
  useEffect(() => {
    if (searchResults) {
      console.log('Search results received:', searchResults.length, searchResults);
    }
  }, [searchResults]);
  
  // Determine if we have any results to show 
  const hasResults = !searchLoading && searchResults && searchResults.length > 0;
  const noResults = !searchLoading && currentQuery && (!searchResults || searchResults.length === 0);
  
  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        {/* Search form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              type="text"
              placeholder="Search videos, images, and embedded content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border-[#333]"
            />
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 text-black font-bold"
            >
              Search
            </Button>
          </div>
        </form>
        
        {/* Filters */}
        <div className="mb-6">
          {/* Content type tabs */}
          <Tabs
            value={contentType}
            onValueChange={handleContentTypeChange}
            className="mb-4"
          >
            <TabsList className="bg-[#1a1a1a] border border-[#333]">
              <TabsTrigger 
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                All Content
              </TabsTrigger>
              <TabsTrigger 
                value="video"
                className="data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Videos
              </TabsTrigger>
              <TabsTrigger 
                value="image"
                className="data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Images
              </TabsTrigger>
              <TabsTrigger 
                value="embed"
                className="data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Embeds
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Category navigation */}
          {categoriesLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <CategoryNavigation
              categories={categories || []}
              activeCategory={categorySlug}
              onCategoryChange={handleCategoryChange}
            />
          )}
        </div>
        
        {/* Search results */}
        <div>
          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-gray-400">Searching...</p>
            </div>
          ) : noResults ? (
            <div className="text-center py-12 bg-[#1a1a1a] rounded-md">
              <h2 className="text-2xl font-bold mb-2">No results found</h2>
              <p className="text-gray-400 mb-4">
                We couldn't find any matches for "{currentQuery}"
              </p>
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Suggestions:</h3>
                <ul className="text-gray-400 list-disc list-inside">
                  <li>Check your spelling</li>
                  <li>Try more general keywords</li>
                  <li>Try different keywords</li>
                  <li>Try fewer filters</li>
                </ul>
              </div>
            </div>
          ) : hasResults ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Search results for "{currentQuery}"
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {searchResults.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onPreview={() => handlePreview(video.id)}
                    onWishlist={() => handleWishlist(video.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}