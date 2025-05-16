import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Video, Comment } from "@shared/schema";
import { getIdFromSlug } from "@/lib/seoUrl";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Heart,
  Flag,
  Share,
  MessageSquare,
  ThumbsUp,
  Flag as FlagIcon,
  Twitter,
  Facebook,
  Linkedin,
  Link as LinkIcon,
  Copy,
  X as XIcon,
  Terminal,
  Maximize,
} from "lucide-react";
import GenericVideoEmbed from "@/components/GenericVideoEmbed";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  generateVideoStructuredData,
  generateImageStructuredData,
} from "@/lib/structuredData";
import AIWatermark from "@/components/AIWatermark";
import VideoCard from "@/components/VideoCard";
import FullscreenImageModal from "@/components/FullscreenImageModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Separate component for related videos to avoid React hook rules violation
function RelatedVideos({ videoId }: { videoId: string }) {
  const { data: relatedVideos = [] } = useQuery<Video[]>({
    queryKey: [`/api/videos/${videoId}/related`],
    enabled: !!videoId,
    select: (data) => data?.slice(0, 6) ?? [],
  });

  if (relatedVideos.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No related content found
      </div>
    );
  }

  return (
    <>
      {relatedVideos.map((relatedVideo) => (
        <div key={relatedVideo.id} className="w-full">
          <VideoCard video={relatedVideo} compact={true} />
        </div>
      ))}
    </>
  );
}

export default function MediaDetailNew() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [location, setLocation] = useLocation();

  // Extract the numeric ID from the slug - with better debugging
  console.log(`Media detail page - Raw slug from URL:`, slug);
  
  // If the slug contains a dash, it's likely a SEO-friendly URL
  let rawId;
  if (slug && slug.includes('-')) {
    rawId = getIdFromSlug(slug);
  } else {
    // Fall back to direct ID if it doesn't look like a slug
    rawId = slug ? parseInt(slug) : undefined;
  }
  
  // Make sure we have a valid ID
  const id = rawId ? String(rawId) : undefined;

  console.log(`Media detail page - Extracted ID: ${id}, Slug: ${slug}, Raw ID: ${rawId}`);

  const [commentText, setCommentText] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [fullscreenImageOpen, setFullscreenImageOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState("");
  const shareUrlRef = useRef<HTMLInputElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [uploaderUsername, setUploaderUsername] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if the URL has a report parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("report")) {
      setReportDialogOpen(true);
      // Remove the report parameter from the URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch media details
  const {
    data: media,
    isLoading: mediaLoading,
    error: mediaError,
  } = useQuery<Video>({
    queryKey: [`/api/videos/${id}`],
    queryFn: async () => {
      try {
        console.log(`Fetching media with ID: ${id}`);
        const res = await apiRequest("GET", `/api/videos/${id}`);
        if (!res.ok) {
          throw new Error(
            `Failed to fetch media: ${res.status} ${res.statusText}`,
          );
        }
        const data = await res.json();
        console.log("Media detail API response:", data);
        return data;
      } catch (error) {
        console.error(`Error fetching media with ID ${id}:`, error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
    staleTime: 30000,
  });

  // Fetch comments for this media
  const { data: comments = [], isLoading: commentsLoading } = useQuery<
    Comment[]
  >({
    queryKey: [`/api/videos/${id}/comments`],
    enabled: !!id,
  });

  // Fetch like status
  const { data: likeData } = useQuery<{ isLiked: boolean; count: number }>({
    queryKey: [`/api/videos/${id}/like`],
    enabled: !!id,
  });

  // Update like state when data is fetched
  useEffect(() => {
    if (likeData) {
      setIsLiked(likeData.isLiked);
      setLikeCount(likeData.count || 0);
    }
  }, [likeData]);

  // Fetch uploader username when media loads
  useEffect(() => {
    if (media && media.userId) {
      const fetchUploaderUsername = async () => {
        try {
          const response = await apiRequest(
            "GET",
            `/api/users/${media.userId}/profile`,
          );
          const data = await response.json();
          if (data && data.username) {
            setUploaderUsername(data.username);
          }
        } catch (error) {
          console.error("Error fetching uploader username:", error);
        }
      };

      fetchUploaderUsername();
    }
  }, [media]);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: {
      videoId: number;
      text: string;
      userId?: number;
      username?: string;
    }) => {
      const res = await apiRequest("POST", `/api/videos/${id}/comments`, {
        username: comment.username || "Anonymous",
        content: comment.text,
      });
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: [`/api/videos/${id}/comments`],
      });
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding comment",
        description:
          error.message || "Could not add your comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Report content mutation
  const reportMutation = useMutation({
    mutationFn: async (report: {
      videoId: number;
      reason: string;
      userId?: number;
    }) => {
      const res = await apiRequest("POST", "/api/reports", report);
      return res.json();
    },
    onSuccess: () => {
      setReportDialogOpen(false);
      setReportReason("");
      toast({
        title: "Content reported",
        description: "Thank you for your report. Our team will review it.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error reporting content",
        description:
          error.message || "Could not submit your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      console.log(`Attempting to like video with ID: ${id}`);
      setIsLikeLoading(true);
      const res = await apiRequest("POST", `/api/videos/${id}/like`);
      const data = await res.json();
      console.log(`Like response:`, data);
      return data;
    },
    onSuccess: (data) => {
      setIsLiked(true);
      setLikeCount(data.count || 0);
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${id}/like`] });
      toast({
        title: "Content liked",
        description: "You liked this content",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error liking content",
        description:
          error.message || "Could not like this content. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLikeLoading(false);
    },
  });

  // Unlike mutation
  const unlikeMutation = useMutation({
    mutationFn: async () => {
      console.log(`Attempting to unlike video with ID: ${id}`);
      setIsLikeLoading(true);
      const res = await apiRequest("DELETE", `/api/videos/${id}/like`);
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setIsLiked(false);
      setLikeCount(data.count || 0);
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${id}/like`] });
      toast({
        title: "Like removed",
        description: "You removed your like from this content",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing like",
        description:
          error.message || "Could not remove your like. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLikeLoading(false);
    },
  });

  // Handle comment submission
  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;

    addCommentMutation.mutate({
      videoId: parseInt(id),
      text: commentText,
      // If user is authenticated, include user ID and username
      ...(user
        ? { userId: user.id, username: user.username }
        : { username: "Anonymous" }),
    });
  };

  // Handle report submission
  const handleReportSubmit = () => {
    if (!reportReason.trim()) return;

    reportMutation.mutate({
      videoId: parseInt(id),
      reason: reportReason,
      // Include user ID if authenticated
      ...(user ? { userId: user.id } : {}),
    });
  };

  // Copy URL to clipboard
  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/media/${id}`;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          setCopySuccess("Link copied to clipboard!");
          setTimeout(() => setCopySuccess(""), 2000);
          toast({
            title: "Link copied",
            description: "The link has been copied to your clipboard",
          });
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
          toast({
            title: "Copy failed",
            description: "Please try manually selecting and copying the URL",
            variant: "destructive",
          });
        });
    } else {
      // Fallback for browsers that don't support clipboard API
      if (shareUrlRef.current) {
        shareUrlRef.current.select();
        document.execCommand("copy");
        setCopySuccess("Link copied to clipboard!");
        setTimeout(() => setCopySuccess(""), 2000);
      }
    }
  };

  // Generate embed code for content
  const generateEmbedCode = () => {
    if (!media) return "";

    const mediaUrl = `${window.location.origin}/media/${id}`;
    const title = media.title || "DeepTube content";

    // Create different embed code based on content type
    if (media.contentType === "video") {
      // For videos, create an iframe embed with responsive wrapper
      return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe src="${mediaUrl}/embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen title="${title}"></iframe>
</div>`;
    } else if (media.contentType === "image") {
      // For images, create a responsive image with link
      return `<div style="text-align:center">
  <a href="${mediaUrl}" target="_blank" style="display:inline-block;max-width:100%">
    <img src="${media.imageUrl}" alt="${title}" style="max-width:100%;height:auto;border:0" />
  </a>
  <div style="margin-top:4px;font-size:12px;font-family:Arial,sans-serif;">
    <a href="${mediaUrl}" target="_blank" style="color:#f97316;text-decoration:none">${title} | View on DeepTube</a>
  </div>
</div>`;
    } else if (media.contentType === "embed") {
      // For YouTube embeds - detect from embedCode field or URL pattern
      const embedHtml = media.embedCode;

      if (embedHtml && embedHtml.includes("youtube.com/embed/")) {
        // Extract YouTube ID from existing embed code
        const youtubeMatch = embedHtml.match(
          /youtube\.com\/embed\/([^"&?\/\s]+)/,
        );
        if (youtubeMatch && youtubeMatch[1]) {
          return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%">
  <iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe>
  <div style="position:absolute;bottom:10px;right:10px;font-size:12px;font-family:Arial,sans-serif;z-index:10">
    <a href="${mediaUrl}" target="_blank" style="color:#f97316;text-decoration:none">View on DeepTube</a>
  </div>
</div>`;
        }
      }

      // If we have an embed code, wrap it in a responsive container
      if (embedHtml) {
        // Try to make the embed code responsive by wrapping it
        return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%">
  <div style="position:absolute;top:0;left:0;width:100%;height:100%">
    ${embedHtml}
  </div>
  <div style="position:absolute;bottom:10px;right:10px;font-size:12px;font-family:Arial,sans-serif;z-index:10">
    <a href="${mediaUrl}" target="_blank" style="color:#f97316;text-decoration:none">View on DeepTube</a>
  </div>
</div>`;
      }
    }

    // Default fallback - link with title
    return `<a href="${mediaUrl}" target="_blank">${title}</a>`;
  };

  // Handle copying embed code to clipboard
  const handleCopyEmbedCode = () => {
    const embedCode = generateEmbedCode();

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(embedCode)
        .then(() => {
          toast({
            title: "Embed code copied",
            description: "The embed code has been copied to your clipboard",
          });
        })
        .catch((err) => {
          console.error("Could not copy embed code: ", err);
          toast({
            title: "Copy failed",
            description:
              "Please try manually selecting and copying the embed code",
            variant: "destructive",
          });
        });
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = embedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      toast({
        title: "Embed code copied",
        description: "The embed code has been copied to your clipboard",
      });
    }
  };

  // Share to social media
  const handleSocialShare = (platform: string) => {
    if (!media) return;

    const shareUrl = `${window.location.origin}/media/${id}`;
    const shareTitle = media.title || "Check out this content on DeepTube";
    const shareText =
      media.description || "Interesting AI-generated content on DeepTube";

    let shareLink = "";

    switch (platform) {
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
        break;
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "tiktok":
        // TikTok doesn't have a direct web sharing API, but we can open TikTok and let the user copy/paste
        shareLink = `https://www.tiktok.com/`;
        break;
      case "reddit":
        shareLink = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`;
        break;
      case "linkedin":
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      default:
        shareLink = shareUrl;
    }

    // Open in new window
    window.open(shareLink, "_blank", "width=600,height=400");
    setShareDialogOpen(false);
  };

  if (mediaLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 flex justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500 rounded-full border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  if (!media) {
    console.error(`Media not found for ID: ${id}. Error:`, mediaError);
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Content Not Found</h1>
            <p className="text-gray-400 mb-6">
              The content you're looking for doesn't exist or has been removed.
            </p>

            {/* Simple retry button for error cases */}
            <div className="mt-4 mb-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  window.location.reload();
                }}
              >
                Retry Loading
              </Button>
            </div>

            <Button onClick={() => setLocation("/")}>Return to Homepage</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Generate SEO metadata
  const generatorInfo = media.aiGenerator
    ? ` created with ${media.aiGenerator}`
    : "";
  const seoTitle = `${media.title}${generatorInfo} | DeepTube: Ethical AI Media Hub`;

  // Create description including prompt if available
  const promptInfo = media.prompt
    ? ` Prompt: "${media.prompt.substring(0, 50)}${media.prompt.length > 50 ? "..." : ""}"`
    : "";
  const baseDescription = media.description
    ? `${media.description.substring(0, 100)}${media.description.length > 100 ? "..." : ""}`
    : `Experience this AI-generated ${media.contentType}${generatorInfo}.`;

  const seoDescription = `DeepTube.co: ${baseDescription}${promptInfo}`;
  const seoImage = media.thumbnail || media.imageUrl || "";
  const seoCanonicalUrl = `https://deeptube.co/media/${id}`;

  // Create specific keywords including media attributes
  const specificKeywords = [
    `AI ${media.contentType}`,
    media.aiGenerator || "AI generation",
    media.title.split(" ").slice(0, 3).join(", "),
    media.prompt ? media.prompt.split(" ").slice(0, 5).join(", ") : "",
  ]
    .filter(Boolean)
    .join(", ");

  const seoKeywords = `${specificKeywords}, AI media hosting, Responsible AI media, DeepTube, AI-powered ${media.contentType}, Trusted content, Creator media platform`;

  // Generate structured data for rich snippets in search results
  const mediaStructuredData =
    media.contentType === "image"
      ? generateImageStructuredData(media)
      : generateVideoStructuredData(media);

  // Debug the video URL
  const videoUrl = media.videoUrl || `/api/videos/${media.id}/direct`;
  console.log(`Using video URL: ${videoUrl} for media ID: ${media.id}`);

  return (
    <Layout>
      <SEO
        title={seoTitle}
        description={seoDescription}
        ogImage={seoImage}
        canonicalUrl={seoCanonicalUrl}
        ogType="article"
        keywords={seoKeywords}
        structuredData={mediaStructuredData}
      />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content column */}
          <div className="lg:col-span-2">
            {/* Media display section */}
            <div className="bg-[#121212] rounded-md overflow-hidden mb-4">
              {media.contentType === "video" && (
                <div className="aspect-video">
                  {/* Use the video's path directly from media.id for reliable playback */}
                  <GenericVideoEmbed
                    videoUrl={videoUrl}
                    title={media.title}
                    responsive={true}
                    autoplay={true}
                    aiGenerator={media.aiGenerator}
                  />
                  {/* Debug output for media object in development */}
                  {process.env.NODE_ENV === "development" && (
                    <div className="text-xs bg-black bg-opacity-50 p-2 mt-2 rounded max-h-20 overflow-auto">
                      <details>
                        <summary className="text-gray-400 cursor-pointer">
                          Debug Info
                        </summary>
                        <pre className="text-gray-400 mt-1 whitespace-pre-wrap">
                          <p>ID: {media.id}</p>
                          <p>VideoURL: {media.videoUrl}</p>
                          <p>DirectURL: {`/api/videos/${media.id}/direct`}</p>
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {media.contentType === "image" && media.imageUrl && (
                <div className="flex items-center justify-center bg-black relative group">
                  <img
                    src={media.imageUrl}
                    alt={media.title}
                    className="max-w-full max-h-[70vh]"
                    onError={(e) => {
                      console.error(`Error loading image: ${media.imageUrl}`);
                      // Fallback to thumbnail if image can't load
                      (e.target as HTMLImageElement).src =
                        media.thumbnail || "/placeholder/image-placeholder.svg";
                    }}
                    onClick={() => setFullscreenImageOpen(true)}
                  />
                  <div
                    className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-70 p-2 rounded-tl-md cursor-pointer"
                    onClick={() => setFullscreenImageOpen(true)}
                  >
                    <Maximize className="w-5 h-5 text-white" />
                  </div>

                  {/* AI Generator Watermark */}
                  {media.aiGenerator && (
                    <AIWatermark generator={media.aiGenerator} />
                  )}
                </div>
              )}

              {media.contentType === "embed" && media.embedCode && (
                <div className="aspect-video relative">
                  {/* Parse embed code with dangerouslySetInnerHTML */}
                  <div
                    dangerouslySetInnerHTML={{ __html: media.embedCode }}
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>

            {/* Title and metadata section */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{media.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm mb-3">
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {comments.length} comments
                </div>
                <div>
                  {new Date(media.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-1 ${isLiked ? "text-orange-500 border-orange-500" : ""}`}
                  onClick={() => {
                    if (isLikeLoading) return;
                    if (isLiked) {
                      unlikeMutation.mutate();
                    } else {
                      likeMutation.mutate();
                    }
                  }}
                  disabled={isLikeLoading}
                >
                  {isLikeLoading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white rounded-full border-t-transparent"></div>
                  ) : (
                    <ThumbsUp
                      className={`w-4 h-4 ${isLiked ? "fill-orange-500" : ""}`}
                    />
                  )}
                  <span>{isLiked ? "Liked" : "Like"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => setReportDialogOpen(true)}
                >
                  <FlagIcon className="w-4 h-4" />
                  <span>Report</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share className="w-4 h-4" />
                  <span>Share</span>
                </Button>
              </div>

              {/* Uploader info if available */}
              {uploaderUsername && (
                <div className="flex items-center space-x-2 mb-4">
                  <div className="text-sm">
                    Uploaded by:{" "}
                    <Link
                      href={`/user/${media.userId}`}
                      className="text-orange-500 hover:underline"
                    >
                      {uploaderUsername}
                    </Link>
                  </div>
                </div>
              )}

              {/* Category if available */}
              {media.categoryId && media.categoryName && (
                <div className="mb-4">
                  <Link
                    href={`/?category=${media.categorySlug || media.categoryId}`}
                    className="inline-block bg-orange-600 bg-opacity-20 text-orange-500 rounded-full px-3 py-1 text-sm"
                  >
                    {media.categoryName}
                  </Link>
                </div>
              )}

              {/* AI Generator Box */}
              {media.aiGenerator && (
                <div className="mb-4 p-3 bg-black bg-opacity-50 rounded-md border border-[#333]">
                  <div className="text-sm flex items-center">
                    <Terminal className="w-4 h-4 mr-2 text-orange-500" />
                    <span className="font-medium text-orange-500">
                      AI Generator:
                    </span>
                    <span className="ml-2">{media.aiGenerator}</span>
                  </div>
                </div>
              )}

              {/* Prompt Box (if available) */}
              {media.prompt && (
                <div className="mb-4">
                  <div className="p-3 bg-[#121212] rounded-md border border-[#333]">
                    <h3 className="text-sm font-semibold mb-1 text-orange-500">
                      Prompt:
                    </h3>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                      {media.prompt}
                    </p>
                  </div>
                </div>
              )}

              {/* Description Box (if available) */}
              {media.description && (
                <div className="mb-4">
                  <div className="p-3 bg-[#121212] rounded-md border border-[#333]">
                    <h3 className="text-sm font-semibold mb-1 text-orange-500">
                      Description:
                    </h3>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                      {media.description}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Comments section */}
            <div>
              <h3 className="text-xl font-bold mb-4">
                Comments ({comments.length})
              </h3>

              {/* Comment input */}
              <div className="mb-6">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="mb-2 min-h-[100px]"
                />
                <Button
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                >
                  {addCommentMutation.isPending ? (
                    <span className="flex items-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                      Posting...
                    </span>
                  ) : (
                    "Post Comment"
                  )}
                </Button>
              </div>

              {/* Comments list */}
              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-orange-500 rounded-full border-t-transparent"></div>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 bg-[#121212] rounded-md"
                    >
                      <div className="flex items-center mb-2">
                        <Avatar className="w-8 h-8 mr-2">
                          <AvatarFallback>
                            {comment.username?.charAt(0).toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">
                            {comment.username || "Anonymous"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          </div>

          {/* Sidebar column */}
          <div>
            {/* Related videos section */}
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4">Related Content</h3>
              <div className="space-y-4">
                <RelatedVideos videoId={id} />
              </div>
            </div>

            {/* Mini Footer for SEO */}
            <MiniFooter />
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Content</DialogTitle>
            <DialogDescription>
              Please let us know why you're reporting this content.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Describe the issue with this content..."
            className="min-h-[100px]"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReportSubmit}
              disabled={reportMutation.isPending || !reportReason.trim()}
            >
              {reportMutation.isPending ? (
                <span className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Submitting...
                </span>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Content</DialogTitle>
            <DialogDescription>
              Share this content through various platforms.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-3 justify-center mb-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 bg-[#1DA1F2] text-white hover:bg-[#1DA1F2]/80"
              onClick={() => handleSocialShare("twitter")}
            >
              <Twitter className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 bg-[#1877F2] text-white hover:bg-[#1877F2]/80"
              onClick={() => handleSocialShare("facebook")}
            >
              <Facebook className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 bg-[#FF4500] text-white hover:bg-[#FF4500]/80"
              onClick={() => handleSocialShare("reddit")}
            >
              <div className="h-5 w-5 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-18c4.411 0 8 3.589 8 8s-3.589 8-8 8-8-3.589-8-8 3.589-8 8-8zm3.5 9c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5 1.5-.672 1.5-1.5zm-7 0c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5 1.5-.672 1.5-1.5zm3.501 4.531C9.613 17.531 7 17.082 7 17.082c-.207-.035-.399.098-.441.304-.042.205.093.403.3.441 0 0 2.108.4 5.141.4 3.039 0 5.141-.4 5.141-.4.205-.038.342-.236.3-.441-.043-.206-.235-.34-.44-.304 0 0-2.613.45-5-.001z" />
                </svg>
              </div>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 bg-[#0A66C2] text-white hover:bg-[#0A66C2]/80"
              onClick={() => handleSocialShare("linkedin")}
            >
              <Linkedin className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 bg-[#000000] text-white hover:bg-[#000000]/80"
              onClick={() => handleCopyShareLink()}
            >
              <Copy className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Direct link</div>
            <div className="flex">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/media/${id}`}
                ref={shareUrlRef}
                className="flex-1 rounded-l-md px-3 py-2 text-sm bg-[#121212] border border-[#333]"
              />
              <Button className="rounded-l-none" onClick={handleCopyShareLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            {copySuccess && (
              <div className="text-green-500 mt-1 text-sm">{copySuccess}</div>
            )}
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Embed code</div>
            <div className="bg-[#121212] rounded-md p-2 text-xs overflow-auto max-h-[80px] border border-[#333]">
              <code className="font-mono whitespace-pre-wrap break-all">
                {generateEmbedCode()}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleCopyEmbedCode}
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy embed code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Modal */}
      {media.contentType === "image" && media.imageUrl && (
        <FullscreenImageModal
          isOpen={fullscreenImageOpen}
          onClose={() => setFullscreenImageOpen(false)}
          imageUrl={media.imageUrl}
          alt={media.title}
        />
      )}
    </Layout>
  );
}
