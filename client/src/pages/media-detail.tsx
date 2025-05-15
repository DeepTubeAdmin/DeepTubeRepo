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
import { Heart, Flag, Share, MessageSquare, ThumbsUp, Flag as FlagIcon, Twitter, Facebook, Linkedin, Link as LinkIcon, Copy, X as XIcon, Terminal, Maximize } from "lucide-react";
import GenericVideoEmbed from "@/components/GenericVideoEmbed";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateVideoStructuredData, generateImageStructuredData } from "@/lib/structuredData";
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
  DialogTrigger,
} from "@/components/ui/dialog";

// Separate component for related videos to avoid React hook rules violation
function RelatedVideos({ videoId }: { videoId: string }) {
  const { data: relatedVideos } = useQuery<Video[]>({
    queryKey: [`/api/videos/${videoId}/related`],
    enabled: !!videoId,
    select: (data) => data?.slice(0, 6)
  });

  if (!relatedVideos || relatedVideos.length === 0) {
    return <div className="text-gray-500 text-center py-4">No related content found</div>;
  }

  return (
    <>
      {relatedVideos.map((relatedVideo) => (
        <div key={relatedVideo.id} className="w-full">
          <VideoCard 
            video={relatedVideo}
            compact={true}
          />
        </div>
      ))}
    </>
  );
}

export default function MediaDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [location, setLocation] = useLocation();
  
  // Extract the numeric ID from the slug
  const rawId = getIdFromSlug(slug);
  const id = rawId ? String(rawId) : slug;
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
    // Parse the URL search parameters
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('report')) {
      setReportDialogOpen(true);
      
      // Remove the report parameter from the URL without refreshing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);
  
  // Fetch media details
  const { data: media, isLoading: mediaLoading } = useQuery<Video>({
    queryKey: [`/api/videos/${id}`],
    enabled: !!id,
  });
  
  // Fetch comments for this media
  const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: [`/api/videos/${id}/comments`],
    enabled: !!id,
  });
  
  // Fetch like status
  const { data: likeData } = useQuery<{ isLiked: boolean; count: number }>({
    queryKey: [`/api/videos/${id}/like`],
    enabled: !!id
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
          const response = await apiRequest('GET', `/api/users/${media.userId}/profile`);
          const data = await response.json();
          if (data && data.username) {
            setUploaderUsername(data.username);
          }
        } catch (error) {
          console.error('Error fetching uploader username:', error);
        }
      };
      
      fetchUploaderUsername();
    }
  }, [media]);
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: { videoId: number; text: string; userId?: number; username?: string }) => {
      const res = await apiRequest("POST", `/api/videos/${id}/comments`, {
        username: comment.username || "Anonymous",
        content: comment.text
      });
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${id}/comments`] });
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding comment",
        description: error.message || "Could not add your comment. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Report content mutation
  const reportMutation = useMutation({
    mutationFn: async (report: { videoId: number; reason: string; userId?: number }) => {
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
        description: error.message || "Could not submit your report. Please try again.",
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
      console.log(`Like successful:`, data);
      setIsLiked(true);
      setLikeCount(data.count || 0);
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${id}/like`] });
      toast({
        title: "Content liked",
        description: "You liked this content",
      });
    },
    onError: (error: any) => {
      console.error(`Like error:`, error);
      toast({
        title: "Error liking content",
        description: error.message || "Could not like this content. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLikeLoading(false);
    }
  });
  
  // Unlike mutation
  const unlikeMutation = useMutation({
    mutationFn: async () => {
      console.log(`Attempting to unlike video with ID: ${id}`);
      setIsLikeLoading(true);
      const res = await apiRequest("DELETE", `/api/videos/${id}/like`);
      const data = await res.json();
      console.log(`Unlike response:`, data);
      return data;
    },
    onSuccess: (data) => {
      console.log(`Unlike successful:`, data);
      setIsLiked(false);
      setLikeCount(data.count || 0);
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${id}/like`] });
      toast({
        title: "Like removed",
        description: "You removed your like from this content",
      });
    },
    onError: (error: any) => {
      console.error(`Unlike error:`, error);
      toast({
        title: "Error removing like",
        description: error.message || "Could not remove your like. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLikeLoading(false);
    }
  });
  
  // Handle comment submission
  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;
    
    addCommentMutation.mutate({
      videoId: parseInt(id),
      text: commentText,
      // If user is authenticated, include user ID and username
      ...(user ? { userId: user.id, username: user.username } : { username: "Anonymous" }),
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
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopySuccess("Link copied to clipboard!");
          setTimeout(() => setCopySuccess(""), 2000);
          toast({
            title: "Link copied",
            description: "The link has been copied to your clipboard"
          });
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
          toast({
            title: "Copy failed",
            description: "Please try manually selecting and copying the URL",
            variant: "destructive"
          });
        });
    } else {
      // Fallback for browsers that don't support clipboard API
      if (shareUrlRef.current) {
        shareUrlRef.current.select();
        document.execCommand('copy');
        setCopySuccess("Link copied to clipboard!");
        setTimeout(() => setCopySuccess(""), 2000);
      }
    }
  };
  
  // Generate embed code for content
  const generateEmbedCode = () => {
    const mediaUrl = `${window.location.origin}/media/${id}`;
    const title = media ? media.title : "DeepTube content";
    
    // Create different embed code based on content type
    if (media && media.contentType === 'video') {
      // For videos, create an iframe embed with responsive wrapper
      return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe src="${mediaUrl}/embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen title="${title}"></iframe>
</div>`;
    } else if (media && media.contentType === 'image') {
      // For images, create a responsive image with link
      return `<div style="text-align:center">
  <a href="${mediaUrl}" target="_blank" style="display:inline-block;max-width:100%">
    <img src="${media.imageUrl}" alt="${title}" style="max-width:100%;height:auto;border:0" />
  </a>
  <div style="margin-top:4px;font-size:12px;font-family:Arial,sans-serif;">
    <a href="${mediaUrl}" target="_blank" style="color:#f97316;text-decoration:none">${title} | View on DeepTube</a>
  </div>
</div>`;
    } else if (media && media.contentType === 'embed') {
      // For YouTube embeds - detect from embedCode field or URL pattern
      const embedHtml = media.embedCode;
      
      if (embedHtml && embedHtml.includes('youtube.com/embed/')) {
        // Extract YouTube ID from existing embed code
        const youtubeMatch = embedHtml.match(/youtube\.com\/embed\/([^"&?\/\s]+)/);
        if (youtubeMatch && youtubeMatch[1]) {
          return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%">
  <iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe>
  <div style="position:absolute;bottom:10px;right:10px;font-size:12px;font-family:Arial,sans-serif;z-index:10">
    <a href="${mediaUrl}" target="_blank" style="color:#f97316;text-decoration:none">View on DeepTube</a>
  </div>
</div>`;
        }
      }
      
      // Only handle YouTube, S3, and images now
      
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
      navigator.clipboard.writeText(embedCode)
        .then(() => {
          toast({
            title: "Embed code copied",
            description: "The embed code has been copied to your clipboard"
          });
        })
        .catch(err => {
          console.error('Could not copy embed code: ', err);
          toast({
            title: "Copy failed",
            description: "Please try manually selecting and copying the embed code",
            variant: "destructive"
          });
        });
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = embedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Embed code copied",
        description: "The embed code has been copied to your clipboard"
      });
    }
  };

  // Share to social media
  const handleSocialShare = (platform: string) => {
    const shareUrl = `${window.location.origin}/media/${id}`;
    const shareTitle = media ? media.title : "Check out this content on DeepTube";
    const shareText = media?.description || "Interesting AI-generated content on DeepTube";
    
    let shareLink = '';
    
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'tiktok':
        // TikTok doesn't have a direct web sharing API, but we can open TikTok and let the user copy/paste
        // This will at least bring them to TikTok's website
        shareLink = `https://www.tiktok.com/upload?refer=web`;
        toast({
          title: "TikTok Sharing",
          description: "Copy the embed code from above first, then use it in your TikTok post."
        });
        break;
      case 'instagram':
        // Instagram also doesn't have a direct web sharing API
        // We'll open Instagram and inform users they need to copy/paste
        shareLink = `https://www.instagram.com/`;
        toast({
          title: "Instagram Sharing",
          description: "Copy the link or embed code first, then use it in your Instagram post."
        });
        break;
      default:
        return;
    }
    
    // Open in new window
    window.open(shareLink, '_blank', 'width=600,height=400');
    setShareDialogOpen(false);
  };
  
  if (mediaLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 flex justify-center">
          <div className="loading-spinner w-12 h-12"></div>
        </div>
      </Layout>
    );
  }
  
  if (!media) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Content Not Found</h1>
            <p className="text-gray-400 mb-6">The content you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => setLocation('/')}>
              Return to Homepage
            </Button>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Generate SEO metadata based on the media content
  const generatorInfo = media.aiGenerator ? ` created with ${media.aiGenerator}` : '';
  const seoTitle = `${media.title}${generatorInfo} | DeepTube: Ethical AI Media Hub`;
  
  // Create description that includes prompt if available
  const promptInfo = media.prompt ? ` Prompt: "${media.prompt.substring(0, 50)}${media.prompt.length > 50 ? '...' : ''}"` : '';
  const baseDescription = media.description 
    ? `${media.description.substring(0, 100)}${media.description.length > 100 ? '...' : ''}` 
    : `Experience this AI-generated ${media.contentType}${generatorInfo}.`;
  
  const seoDescription = `DeepTube.co: ${baseDescription}${promptInfo}`;
  const seoImage = media.thumbnail || media.imageUrl || '';
  const seoCanonicalUrl = `https://deeptube.co/media/${id}`;
  
  // Create more specific keywords including media attributes
  const specificKeywords = [
    `AI ${media.contentType}`,
    media.aiGenerator || 'AI generation',
    media.title.split(' ').slice(0, 3).join(', '),
    media.prompt ? media.prompt.split(' ').slice(0, 5).join(', ') : '',
  ].filter(Boolean).join(', ');
  
  const seoKeywords = `${specificKeywords}, AI media hosting, Responsible AI media, DeepTube, AI-powered ${media.contentType}, Trusted content, Creator media platform`;
  
  // Generate structured data for rich snippets in search results
  const mediaStructuredData = media.contentType === 'image' 
    ? generateImageStructuredData(media)
    : generateVideoStructuredData(media);

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
              {media.contentType === 'video' && (
                <div className="aspect-video">
                  <GenericVideoEmbed 
                    videoUrl={media.videoUrl ? media.videoUrl : ''}
                    title={media.title}
                    responsive={true}
                    autoplay={true}
                    aiGenerator={media.aiGenerator}
                  />
                  {/* Debug output for media object only in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs bg-black bg-opacity-50 p-2 mt-2 rounded max-h-20 overflow-auto">
                      <details>
                        <summary className="text-gray-400 cursor-pointer">Debug: Media Object</summary>
                        <pre className="text-gray-400 mt-1 whitespace-pre-wrap">
                          {JSON.stringify(media, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
              
              {media.contentType === 'image' && media.imageUrl && (
                <div className="flex items-center justify-center bg-black relative group">
                  <img 
                    src={media.imageUrl} 
                    alt={media.title} 
                    className="max-w-full max-h-[70vh]"
                    onError={(e) => {
                      console.error(`Error loading image: ${media.imageUrl}`);
                      
                      // Try to clean up the path if it contains workspace references
                      let cleanedUrl = media.imageUrl;
                      
                      if (media.imageUrl && media.imageUrl.includes('/home/runner/workspace/')) {
                        const match = media.imageUrl.match(/\/home\/runner\/workspace\/(.+)/);
                        if (match && match[1]) {
                          cleanedUrl = `/${match[1]}`;
                          console.log(`Image: Cleaned workspace path: ${media.imageUrl} → ${cleanedUrl}`);
                          e.currentTarget.src = cleanedUrl;
                          return;
                        }
                      }
                      
                      // Special case for absolute path references that should be relative
                      if (media.imageUrl && media.imageUrl.startsWith('/api/s3/home/')) {
                        const pathParts = media.imageUrl.split('/home/');
                        if (pathParts.length > 1) {
                          const fileParts = pathParts[1].split('/');
                          cleanedUrl = `/uploads/images/${fileParts[fileParts.length - 1]}`;
                          console.log(`Image: Converted absolute path: ${media.imageUrl} → ${cleanedUrl}`);
                          e.currentTarget.src = cleanedUrl;
                          return;
                        }
                      }
                      
                      // If still failing, try the thumbnail as a fallback
                      if (media.id) {
                        e.currentTarget.src = `/api/content/${media.id}/thumbnail?t=${Date.now()}`;
                      }
                    }}
                  />
                  {/* Fullscreen button */}
                  <button 
                    onClick={() => setFullscreenImageOpen(true)}
                    className="absolute bottom-4 right-4 bg-black bg-opacity-70 p-2 rounded-full text-white 
                              hover:bg-orange-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                    aria-label="View fullscreen"
                  >
                    <Maximize size={24} />
                  </button>
                  {media.aiGenerator && <AIWatermark aiGenerator={media.aiGenerator} position="bottom-right" size="medium" />}
                </div>
              )}
              
              {/* Fullscreen Image Modal */}
              {media.contentType === 'image' && media.imageUrl && (
                <FullscreenImageModal
                  imageUrl={media.imageUrl}
                  alt={media.title || 'Image'}
                  isOpen={fullscreenImageOpen}
                  onClose={() => setFullscreenImageOpen(false)}
                />
              )}
              
              {media.contentType === 'embed' && media.embedCode && (
                <div className="aspect-video relative overflow-hidden max-h-[calc(100vh-300px)]">
                  {/* For YouTube embeds, ensure autoplay is forced */}
                  {media.embedCode.includes('youtube.com/embed/') ? (
                    <div
                      className="w-full h-0 pb-[56.25%] relative" /* 16:9 aspect ratio with padding trick */
                    >
                      <div 
                        className="absolute top-0 left-0 w-full h-full"
                        dangerouslySetInnerHTML={{
                          __html: media.embedCode.includes('autoplay=1')
                            ? media.embedCode.includes('origin=') 
                              ? media.embedCode.replace(/width="\d+"/, 'width="100%"').replace(/height="\d+"/, 'height="100%"')
                              : media.embedCode.replace(/src="([^"]+)"/, `src="$1&origin=${window.location.origin}"`)
                                .replace(/width="\d+"/, 'width="100%"').replace(/height="\d+"/, 'height="100%"')
                            : media.embedCode
                                .replace(/src="([^"]+)"/, `src="$1?autoplay=1&enablejsapi=1&origin=${window.location.origin}"`)
                                .replace(/src="([^"]+)\?([^"]*)"/, `src="$1?autoplay=1&enablejsapi=1&origin=${window.location.origin}&$2"`)
                                .replace(/width="\d+"/, 'width="100%"').replace(/height="\d+"/, 'height="100%"')
                        }}
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-full h-0 pb-[56.25%] relative" /* 16:9 aspect ratio with padding trick */
                    >
                      <div
                        className="absolute top-0 left-0 w-full h-full"
                        dangerouslySetInnerHTML={{ __html: media.embedCode
                          .replace(/width="\d+"/, 'width="100%"')
                          .replace(/height="\d+"/, 'height="100%"')
                          // Add autoplay parameter to any embed codes (Vimeo, etc.)
                          .replace(/src="([^"]+)"/, (match, url) => {
                            if (url.includes('?')) {
                              return `src="${url}&autoplay=1"`;
                            } else {
                              return `src="${url}?autoplay=1"`;
                            }
                          })
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {!media.videoUrl && !media.imageUrl && !media.embedCode && (
                <div className="aspect-video flex items-center justify-center bg-[#0a0a0a]">
                  <div className="text-gray-500">No media available</div>
                </div>
              )}
            </div>
            
            {/* Media info section */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{media.title}</h1>
              
              {/* Admin notice for pending content */}
              {media.adminNotice && (
                <div className="bg-amber-900/50 border border-amber-600 text-amber-200 px-4 py-2 rounded-md mb-4">
                  <div className="flex items-center">
                    <div className="mr-2">⚠️</div>
                    <div>{media.adminNotice}</div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    {uploaderUsername && (
                      <>
                        <Link 
                          to={`/user/${uploaderUsername}`} 
                          className="text-orange-500 hover:text-orange-400 hover:underline"
                        >
                          {uploaderUsername}
                        </Link>
                        <span className="text-gray-500">•</span>
                      </>
                    )}
                    <span>Added {new Date(media.createdAt).toLocaleDateString()}</span>
                    {media.aiGenerator && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span className="text-orange-500">{media.aiGenerator}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  {/* Like button - more prominent and visually distinct */}
                  <Button 
                    variant={isLiked ? "default" : "outline"} 
                    size="sm" 
                    className={`flex items-center border-2 ${isLiked 
                      ? 'text-black bg-orange-500 hover:bg-orange-400 border-orange-500' 
                      : 'text-white border-gray-500 hover:border-orange-500 hover:text-orange-400'}`}
                    onClick={() => isLiked ? unlikeMutation.mutate() : likeMutation.mutate()}
                    disabled={isLikeLoading}
                  >
                    <ThumbsUp className={`w-5 h-5 mr-1 ${isLikeLoading ? 'animate-pulse' : ''}`} />
                    <span>{isLiked ? 'Liked' : 'Like'}</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-white"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <Share className="w-5 h-5 mr-1" />
                    <span>Share</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-red-500" 
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <FlagIcon className="w-5 h-5 mr-1" />
                    <span>Report</span>
                  </Button>
                </div>
              </div>
              
              {/* Description and Prompt section - redesigned */}
              <div className="mt-6 mb-8 space-y-4">
                {/* Prompt Box */}
                <div className="bg-[#0c0c0c] p-4 rounded-md border border-[#222]">
                  <div className="flex items-center mb-2">
                    <Terminal className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-sm font-semibold text-gray-300">Prompt</span>
                  </div>
                  <p className="text-gray-300 text-sm">{media.prompt || 'No prompt information provided.'}</p>
                </div>
                
                {/* Description Box */}
                <div className="bg-[#0c0c0c] p-4 rounded-md border border-[#222]">
                  <div className="flex items-center mb-2">
                    <MessageSquare className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-sm font-semibold text-gray-300">Description</span>
                  </div>
                  <p className="text-gray-300 text-sm">{media.description || 'No description provided.'}</p>
                </div>
              </div>
            </div>
            
            {/* Comments section */}
            <div>
              <h2 className="text-xl font-bold mb-4">
                Comments
              </h2>
              
              {/* Comment form */}
              <div className="mb-6 flex gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>{user?.username?.[0] || 'A'}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 flex flex-col">
                  <Textarea
                    placeholder="Add a comment..."
                    className="mb-2 bg-[#1a1a1a] border-[#333] resize-none"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button 
                      variant="default" 
                      className="bg-primary text-black hover:bg-primary/90 font-bold"
                      onClick={handleCommentSubmit}
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                    >
                      {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Comments list */}
              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="loading-spinner"></div>
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={comment.userId ? `/api/users/${comment.userId}/avatar` : undefined} />
                        <AvatarFallback>
                          {comment.username ? comment.username[0] : 'A'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          {comment.userId ? (
                            <Link 
                              to={`/user/${comment.username || ''}`} 
                              className="font-semibold mr-2 text-orange-500 hover:text-orange-400 hover:underline"
                            >
                              {comment.username || 'User'}
                            </Link>
                          ) : (
                            <span className="font-semibold mr-2">
                              {comment.username || 'Anonymous'}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-gray-300">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 bg-[#1a1a1a] rounded-md">
                    <MessageSquare className="mx-auto h-10 w-10 text-gray-500 mb-2" />
                    <p className="text-gray-400">No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Sidebar column */}
          <div>
            <h2 className="text-lg font-bold mb-4">Related Content</h2>
            <div className="space-y-4">
              {/* Fetch related content based on content type, tags, etc */}
              {/* Using a separate component for related videos to avoid hook issues */}
              <RelatedVideos videoId={id} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Report dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Content</DialogTitle>
            <DialogDescription>
              Please provide details about why you're reporting this content. Our team will review your report.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Reason for reporting this content..."
              className="bg-[#121212] border-[#333] resize-none min-h-[150px]"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setReportDialogOpen(false)}
              className="border-[#444] text-gray-300 hover:bg-[#222] hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReportSubmit}
              disabled={!reportReason.trim() || reportMutation.isPending}
              className="bg-primary text-black hover:bg-primary/90 font-bold"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Content</DialogTitle>
            <DialogDescription>
              Share this {media.contentType} with others through these options
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <label htmlFor="share-url" className="text-sm font-medium mb-2 block text-gray-300">
                Media Link
              </label>
              <div className="flex items-center">
                <input
                  id="share-url"
                  ref={shareUrlRef}
                  type="text"
                  readOnly
                  className="flex-1 px-3 py-2 bg-[#121212] border border-[#333] rounded-l-md text-sm text-gray-300"
                  value={`${window.location.origin}/media/${id}`}
                />
                <Button
                  onClick={handleCopyShareLink}
                  className="rounded-l-none bg-orange-500 hover:bg-orange-400 text-black"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              {copySuccess && (
                <p className="text-green-500 text-sm mt-1">{copySuccess}</p>
              )}
            </div>
            
            {/* New Embed Code Section */}
            <div className="mt-6 mb-6">
              <label htmlFor="embed-code" className="text-sm font-medium mb-2 block text-gray-300">
                Embed Code
                <span className="text-xs text-gray-500 ml-2">
                  (for sharing on X.com, Facebook, TikTok, Instagram, etc.)
                </span>
              </label>
              <div className="relative">
                <textarea
                  id="embed-code"
                  readOnly
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-md text-sm text-gray-300 font-mono h-20 resize-none"
                  value={generateEmbedCode()}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <Button
                  onClick={handleCopyEmbedCode}
                  className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-400 text-black p-1 h-auto rounded-sm"
                  size="sm"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Copy this code and paste it into your post to embed this content on other platforms.
              </p>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3 text-gray-300">Share on Social Media</h3>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center border-[#333] text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2]"
                  onClick={() => handleSocialShare('twitter')}
                >
                  <Twitter className="w-5 h-5 mr-2" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center border-[#333] text-[#4267B2] hover:bg-[#4267B2] hover:text-white hover:border-[#4267B2]"
                  onClick={() => handleSocialShare('facebook')}
                >
                  <Facebook className="w-5 h-5 mr-2" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center border-[#333] text-[#25F4EE] hover:bg-gradient-to-r hover:from-[#25F4EE] hover:to-[#FE2C55] hover:text-white hover:border-[#25F4EE]"
                  onClick={() => handleSocialShare('tiktok')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                  TikTok
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center border-[#333] text-[#E4405F] hover:bg-gradient-to-r hover:from-[#5851DB] hover:via-[#E1306C] hover:to-[#FCAF45] hover:text-white hover:border-[#E4405F]"
                  onClick={() => handleSocialShare('instagram')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                  </svg>
                  Instagram
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(false)}
              className="border-[#444] text-gray-300 hover:bg-[#222] hover:text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add MiniFooter */}
      <MiniFooter />
    </Layout>
  );
}