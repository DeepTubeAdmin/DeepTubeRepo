import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useContext,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import VideoCard from "./VideoCard";
import LazyImageCard from "./LazyImageCard";

import { Loader2, Filter, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShuffleContext } from "@/App";
import { Video as SharedVideo } from "@shared/schema";
import { Video as ClientVideo } from "@/types";

// Helper function to transform shared schema Video to client Video type
const transformVideoForClient = (video: SharedVideo): ClientVideo => {
  // Add defensive check
  if (!video) {
    console.error("transformVideoForClient: Video object is null or undefined");
    throw new Error("Video object is null or undefined");
  }

  try {
    console.log(
      "transformVideoForClient: Transforming video:",
      video.id,
      video.title
    );

    const transformed = {
      ...video,
      // Add missing properties with default values
      likes: 0, // Will be fetched separately by VideoCard
      uploaderId: video.userId, // Map userId to uploaderId
      uploaderName: video.uploaderName || "", // Default to empty string
      categoryName: video.categoryName || null, // Use category name from backend if available
      categorySlug: video.categorySlug || null, // Use category slug from backend if available
      createdAt:
        typeof video.createdAt === "string"
          ? video.createdAt
          : video.createdAt?.toISOString() || new Date().toISOString(), // Handle both Date and string safely
      // Ensure all required properties exist
      preview: false,
      adminNotice: video.adminNotice,
    } as ClientVideo;

    console.log(
      "transformVideoForClient: Successfully transformed video:",
      transformed.id,
      "Category:",
      transformed.categoryName
    );
    return transformed;
  } catch (error) {
    console.error(
      "transformVideoForClient: Error transforming video:",
      error,
      video
    );
    throw error;
  }
};

interface ContentFeedProps {
  categorySlug?: string;
}

type SortOption = "newest" | "oldest" | "most-viewed" | "trending" | "popular";

// Updated response interface for new content feed structure
interface ContentFeedResponse {
  featured: {
    video: SharedVideo | null;
  };
  content: {
    videos: SharedVideo[];
    images: SharedVideo[];
    adPositions: number[];
    hasMore: boolean;
  };
}

// Chunk interface for rendering
interface ContentChunk {
  videos: ClientVideo[];
  images: ClientVideo[];
}

export default function ContentFeed({ categorySlug }: ContentFeedProps) {
  // Get shuffle context
  const { shuffleSeed: contextShuffleSeed, triggerShuffle } =
    useContext(ShuffleContext);

  // State hooks
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("trending");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [columnCount, setColumnCount] = useState(3); // Default to 3 columns for large screens
  const [loadedVideos, setLoadedVideos] = useState<ClientVideo[]>([]);
  const [loadedImages, setLoadedImages] = useState<ClientVideo[]>([]);
  const [adPositions, setAdPositions] = useState<number[]>([]);

  // State to track if we should show featured video section
  const [shouldShowFeatured, setShouldShowFeatured] = useState(true);
  const [lastFeaturedVideo, setLastFeaturedVideo] =
    useState<ClientVideo | null>(null);

  // Ref hooks
  const previousDataRef = useRef<ContentFeedResponse | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const isInitialMount = useRef(true);
  const currentPageRef = useRef(page);

  // Generate a new shuffle seed on every mount (page refresh) or use URL parameter if available
  const [localShuffleSeed, setLocalShuffleSeed] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Priority 1: Use URL shuffleSeed parameter if available
    if (urlParams.has("shuffleSeed")) {
      return urlParams.get("shuffleSeed") || "";
    }
    // Priority 2: Use URL shuffle parameter for backward compatibility
    else if (urlParams.has("shuffle")) {
      return urlParams.get("shuffle") || "";
    }
    // Priority 3: Generate a new random seed for every page refresh
    else {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const newSeed = `refresh-${timestamp.toString(36)}-${random}`;
      console.log("ContentFeed: Generated new shuffle seed on mount:", newSeed);
      return newSeed;
    }
  });

  // Use shuffleSeed only for page 1, not for pagination
  const queryKey = useMemo(() => {
    return [
      "/api/content/feed",
      {
        page,
        category: categorySlug || "",
        shuffleSeed: page === 1 ? localShuffleSeed : undefined,
        sortBy,
        columnCount, // Send column count to backend for dynamic pagination
        timestamp: page === 1 ? Date.now() : undefined, // prevents cache reuse only for first page
      },
    ];
  }, [page, categorySlug, localShuffleSeed, sortBy, columnCount]);

  // Data fetching with TanStack Query
  const { data, isLoading, isError } = useQuery<ContentFeedResponse>({
    queryKey,
    // Only use placeholder data if we have valid previous data with a featured video
    placeholderData: previousDataRef.current?.featured?.video
      ? previousDataRef.current
      : undefined,
  });

  // Keep page ref updated
  useEffect(() => {
    currentPageRef.current = page;
  }, [page]);

  // Clean up URL parameters after data has been loaded
  useEffect(() => {
    if (data && !isLoading) {
      const urlParams = new URLSearchParams(window.location.search);
      const hasUrlParams =
        urlParams.has("shuffleSeed") || urlParams.has("shuffle");

      if (hasUrlParams && window.history.replaceState) {
        console.log("Clean up URL parameters after data has been loaded");

        // Remove both types of shuffle params for consistency
        if (urlParams.has("shuffleSeed")) {
          urlParams.delete("shuffleSeed");
        }
        if (urlParams.has("shuffle")) {
          urlParams.delete("shuffle");
        }

        const newUrl = urlParams.toString() ? `/?${urlParams.toString()}` : "/";
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [data, isLoading]);

  // Memoized helper functions
  const getItemsBasedOnColumns = useCallback(
    (items: ClientVideo[] = [], rows: number) => {
      const totalItems = columnCount * rows;
      return items?.slice(0, totalItems) || [];
    },
    [columnCount]
  );

  // Event handler callbacks
  const toggleSortMenu = useCallback(() => {
    setShowSortMenu((prev) => !prev);
  }, []);

  const handleSortChange = useCallback((option: SortOption) => {
    console.log("Changing sort option to:", option);
    setSortBy(option);
    setShowSortMenu(false);
    setPage(1);
    setLoadedVideos([]);
    setLoadedImages([]);
    setAdPositions([]);

    // Clear previous data to ensure fresh fetch
    previousDataRef.current = undefined;

    // Don't immediately clear lastFeaturedVideo to prevent flicker
    // It will be updated when new data arrives

    // Immediately invalidate queries to force refresh
    queryClient.invalidateQueries({
      queryKey: ["/api/content/feed"],
    });
  }, []);

  // Process data for rendering - dynamic column/row adjustments
  const getRenderContent = (): ContentChunk[] => {
    if (!loadedVideos.length && !loadedImages.length) return [];

    // Create chunks of content that handle both videos and images flexibly
    const videoChunkSize = 4 * columnCount; // 4 rows of videos
    const imageChunkSize = 2 * columnCount; // 2 rows of images

    const videoChunks: ClientVideo[][] = [];
    const imageChunks: ClientVideo[][] = [];

    // Split videos into chunks of 4 rows
    for (let i = 0; i < loadedVideos.length; i += videoChunkSize) {
      videoChunks.push(loadedVideos.slice(i, i + videoChunkSize));
    }

    // Split images into chunks of 2 rows
    for (let i = 0; i < loadedImages.length; i += imageChunkSize) {
      imageChunks.push(loadedImages.slice(i, i + imageChunkSize));
    }

    // Combine into merged chunks - no ads, just content
    const contentChunks: ContentChunk[] = [];
    const maxChunks = Math.max(videoChunks.length, imageChunks.length);

    for (let i = 0; i < maxChunks; i++) {
      contentChunks.push({
        videos: videoChunks[i] || [],
        images: imageChunks[i] || [],
      });
    }

    return contentChunks;
  };

  const renderContent = getRenderContent();

  // Effect for handling clicks outside the sort menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSortMenu &&
        sortMenuRef.current &&
        sortButtonRef.current &&
        !sortMenuRef.current.contains(event.target as Node) &&
        !sortButtonRef.current.contains(event.target as Node)
      ) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSortMenu]);

  // Effect for updating previous data ref and tracking featured video
  useEffect(() => {
    if (data) {
      console.log("Data received, updating refs:", {
        hasContent: !!data.content,
        hasFeatured: !!data.featured?.video,
        videosLength: data.content?.videos?.length || 0,
        imagesLength: data.content?.images?.length || 0,
      });

      previousDataRef.current = data;

      // Track featured video to maintain continuity
      if (data.featured?.video) {
        try {
          const transformed = transformVideoForClient(data.featured.video);
          setLastFeaturedVideo(transformed);
          console.log("Updated featured video:", transformed.id);
        } catch (error) {
          console.error("Error transforming featured video:", error);
        }
      }
    }
  }, [data]);

  // Effect to reset content when category or sort changes
  useEffect(() => {
    // Skip the initial mount
    if (isInitialMount.current) {
      return;
    }

    console.log(
      `Category or sort changed to: ${categorySlug || "all"} | Sort: ${sortBy}`
    );

    // Reset state for new category/sort
    setPage(1);
    setLoadedVideos([]);
    setLoadedImages([]);
    setAdPositions([]);

    // Clear previous data reference
    previousDataRef.current = undefined;

    // Invalidate queries to force fresh fetch
    queryClient.invalidateQueries({
      queryKey: ["/api/content/feed"],
    });
  }, [categorySlug, sortBy]);

  // Effect for handling content updates
  useEffect(() => {
    if (data?.content) {
      console.log(`Processing content for page ${page}:`, {
        videos: data.content.videos.length,
        images: data.content.images.length,
        hasMore: data.content.hasMore,
      });

      try {
        if (page === 1) {
          // Reset content on first page
          console.log("Resetting content for page 1");
          const transformedVideos = data.content.videos
            .filter((video) => video != null)
            .map((video) => {
              try {
                return transformVideoForClient(video);
              } catch (error) {
                console.error("Failed to transform video:", error, video);
                return null;
              }
            })
            .filter((video) => video != null) as ClientVideo[];

          const transformedImages = data.content.images
            .filter((image) => image != null)
            .map((image) => {
              try {
                return transformVideoForClient(image);
              } catch (error) {
                console.error("Failed to transform image:", error, image);
                return null;
              }
            })
            .filter((image) => image != null) as ClientVideo[];

          console.log("Successfully transformed content:", {
            videos: transformedVideos.length,
            images: transformedImages.length,
          });

          setLoadedVideos(transformedVideos);
          setLoadedImages(transformedImages);
          setAdPositions(data.content.adPositions);
        } else {
          // Append new content for subsequent pages (infinite scroll)
          const newVideos = data.content.videos
            .filter((video) => video != null)
            .map((video) => {
              try {
                return transformVideoForClient(video);
              } catch (error) {
                console.error(
                  "Failed to transform video for page:",
                  page,
                  error,
                  video
                );
                return null;
              }
            })
            .filter((video) => video != null) as ClientVideo[];

          const newImages = data.content.images
            .filter((image) => image != null)
            .map((image) => {
              try {
                return transformVideoForClient(image);
              } catch (error) {
                console.error(
                  "Failed to transform image for page:",
                  page,
                  error,
                  image
                );
                return null;
              }
            })
            .filter((image) => image != null) as ClientVideo[];

          console.log(`Appending content for page ${page}:`, {
            newVideos: newVideos.length,
            newImages: newImages.length,
          });

          if (newVideos.length > 0) {
            setLoadedVideos((prev) => {
              // Check if any of the new videos already exist to prevent duplicates
              const existingIds = new Set(prev.map((v) => v.id));
              const uniqueNewVideos = newVideos.filter(
                (v) => !existingIds.has(v.id)
              );
              console.log(
                `Adding ${uniqueNewVideos.length} unique videos out of ${newVideos.length} new videos`
              );
              return [...prev, ...uniqueNewVideos];
            });
          }

          if (newImages.length > 0) {
            setLoadedImages((prev) => {
              // Check if any of the new images already exist to prevent duplicates
              const existingIds = new Set(prev.map((i) => i.id));
              const uniqueNewImages = newImages.filter(
                (i) => !existingIds.has(i.id)
              );
              console.log(
                `Adding ${uniqueNewImages.length} unique images out of ${newImages.length} new images`
              );
              return [...prev, ...uniqueNewImages];
            });
          }

          setAdPositions((prev) => [...prev, ...data.content.adPositions]);
        }
      } catch (error) {
        console.error("Error processing content data:", error, data);
        // Don't update state if there's an error processing data
      }
    }
  }, [data]);

  // This effect handles URL parameters for shuffle
  useEffect(() => {
    // Only run once on mount
    if (!isInitialMount.current) return;

    isInitialMount.current = false;

    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const hasShuffleSeedParam = urlParams.has("shuffleSeed");
    const shuffleSeedValue = urlParams.get("shuffleSeed");
    const hasShuffleParam = !hasShuffleSeedParam && urlParams.has("shuffle");
    const shuffleValue = hasShuffleParam ? urlParams.get("shuffle") : null;

    // If the shuffle is coming from URL parameters, update the seed
    if (
      (hasShuffleSeedParam || hasShuffleParam) &&
      (shuffleSeedValue || shuffleValue)
    ) {
      const finalShuffleValue = shuffleSeedValue || shuffleValue || "";
      console.log(
        "ContentFeed: Processing explicit shuffle from URL with seed:",
        finalShuffleValue
      );
      setLocalShuffleSeed(finalShuffleValue);
    }

    console.log(
      "ContentFeed: Initial mount completed with seed:",
      localShuffleSeed
    );
  }, []);

  // Effect for detecting screen size and updating column count
  useEffect(() => {
    function updateColumnCount() {
      // Match the requested breakpoints
      if (window.innerWidth >= 1536) {
        // 2xl breakpoint
        // Large desktop: 3 columns
        setColumnCount(3);
      } else if (window.innerWidth >= 1024) {
        // lg breakpoint
        // Desktop: 2 columns
        setColumnCount(2);
      } else {
        // Mobile, small tablet, tablet: 1 column
        setColumnCount(1);
      }
    }

    // Set initial column count
    updateColumnCount();

    // Update column count when window is resized
    window.addEventListener("resize", updateColumnCount);

    // Clean up event listener on component unmount
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  // Effect for infinite scrolling with intersection observer
  useEffect(() => {
    // Only set up observer if there's more content to load
    if (!data?.content?.hasMore || isLoading) {
      return;
    }

    // Create an observer for the loading indicator
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && data?.content?.hasMore && !isLoading) {
          const nextPage = currentPageRef.current + 1;
          console.log("Loading next page:", nextPage);
          setPage(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    // Observe the loading indicator element
    const loadingElement = document.getElementById("loading-indicator");
    if (loadingElement) {
      observer.observe(loadingElement);
    }

    return () => {
      if (loadingElement) {
        observer.unobserve(loadingElement);
      }
      observer.disconnect();
    };
  }, [data?.content?.hasMore, isLoading]);

  // Loading state
  if (isLoading && page === 1) {
    console.log("ContentFeed: Showing loading state for page 1");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Error state
  if (isError) {
    console.error("ContentFeed: Error state triggered");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-center">
          <h2 className="text-2xl mb-4">Failed to load content</h2>
          <Button
            variant="destructive"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render the content feed
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Header with Sort Controls - Always visible */}
      <div className="flex justify-between items-center mb-6">
        {/* Section title */}
        <h2 className="text-xl font-bold text-white">
          {data?.featured?.video || lastFeaturedVideo
            ? "Featured Video"
            : "Content Feed"}
        </h2>

        {/* Controls: Sort Button */}
        <div className="flex items-center">
          {/* Sort Button and Dropdown */}
          <div className="relative">
            <Button
              ref={sortButtonRef}
              onClick={toggleSortMenu}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 px-3 py-1.5 text-sm border-gray-700 bg-black/50 hover:bg-black/80"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Sort</span>
            </Button>

            {showSortMenu && (
              <div
                ref={sortMenuRef}
                className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-black border border-gray-700 ring-1 ring-black ring-opacity-5 z-50"
              >
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    className={`${
                      sortBy === "oldest"
                        ? "bg-gray-800 text-orange-500"
                        : "text-white"
                    } block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange("oldest")}
                    role="menuitem"
                  >
                    Oldest First
                  </button>
                  <button
                    className={`${
                      sortBy === "newest"
                        ? "bg-gray-800 text-orange-500"
                        : "text-white"
                    } block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange("newest")}
                    role="menuitem"
                  >
                    Newest First
                  </button>
                  <button
                    className={`${
                      sortBy === "most-viewed"
                        ? "bg-gray-800 text-orange-500"
                        : "text-white"
                    } block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange("most-viewed")}
                    role="menuitem"
                  >
                    Most Viewed
                  </button>
                  <button
                    className={`${
                      sortBy === "trending"
                        ? "bg-gray-800 text-orange-500"
                        : "text-white"
                    } block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange("trending")}
                    role="menuitem"
                  >
                    Trending
                  </button>
                  <button
                    className={`${
                      sortBy === "popular"
                        ? "bg-gray-800 text-orange-500"
                        : "text-white"
                    } block px-4 py-2 text-sm w-full text-left hover:bg-gray-800`}
                    onClick={() => handleSortChange("popular")}
                    role="menuitem"
                  >
                    Popular
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Video Section - Always show if we have a featured video */}
      {(data?.featured?.video || lastFeaturedVideo) && (
        <section className="mb-12">
          <div className="max-w-4xl mx-auto">
            {(() => {
              try {
                const featuredVideo = data?.featured?.video
                  ? transformVideoForClient(data.featured.video)
                  : lastFeaturedVideo!;

                return <VideoCard video={featuredVideo} size="large" />;
              } catch (error) {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-400">
                      Failed to load featured video
                    </p>
                  </div>
                );
              }
            })()}
          </div>
        </section>
      )}

      {/* Endless Content Section - No section title as requested */}
      <section>
        {/* Render content chunks (4 rows video + 2 rows images, repeating) */}
        {renderContent && renderContent.length > 0 ? (
          renderContent.map((chunk, chunkIndex) => {
            // For every chunk, render videos first then images
            return (
              <div key={`content-chunk-${chunkIndex}`} className="mb-12">
                {/* Video Grid (4 rows of videos) */}
                {chunk.videos && chunk.videos.length > 0 && (
                  <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 mb-4">
                      {chunk.videos.map((video, index) => {
                        try {
                          return (
                            <VideoCard
                              key={`content-video-${video.id}-${chunkIndex}-${index}`}
                              video={video}
                            />
                          );
                        } catch (error) {
                          console.error(
                            "Error rendering VideoCard:",
                            error,
                            video
                          );
                          return null;
                        }
                      })}
                    </div>
                  </div>
                )}
                {/* Image Grid (2 rows of images) */}
                {chunk.images && chunk.images.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {chunk.images.map((image, index) => {
                      try {
                        return (
                          <LazyImageCard
                            key={`content-image-${image.id}-${chunkIndex}-${index}`}
                            image={image}
                          />
                        );
                      } catch (error) {
                        console.error(
                          "Error rendering LazyImageCard:",
                          error,
                          image
                        );
                        return null;
                      }
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No content available</p>
          </div>
        )}

        {/* Loading indicator for infinite scroll or end of content message */}
        <div id="loading-indicator" className="flex justify-center p-8">
          {(isLoading || data?.content?.hasMore) && (
            <div className="flex items-center gap-2 text-orange-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading more content...</span>
            </div>
          )}

          {!isLoading && !data?.content?.hasMore && (
            <div className="text-center py-8 px-4">
              <div className="max-w-md mx-auto">
                <div className="text-gray-400 text-lg mb-2">
                  🎬 You've reached the end!
                </div>
                <p className="text-gray-500 text-sm">
                  You've seen all the content in this category. Try exploring
                  other categories or check back later for new uploads.
                </p>
                <Button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-4 text-orange-500 border-orange-500 hover:bg-orange-500 hover:text-black"
                >
                  Back to Top
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
