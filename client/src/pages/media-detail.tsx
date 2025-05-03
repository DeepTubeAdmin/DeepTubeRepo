import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Video, Comment } from "@shared/schema";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Heart, Flag, Share, MessageSquare, ThumbsUp, Flag as FlagIcon, Twitter, Facebook, Linkedin, Link as LinkIcon, Copy, X as XIcon } from "lucide-react";
import GenericVideoEmbed from "@/components/GenericVideoEmbed";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateVideoStructuredData, generateImageStructuredData } from "@/lib/structuredData";
import AIWatermark from "@/components/AIWatermark";
import VideoCard from "@/components/VideoCard";
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
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const [commentText, setCommentText] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState("");
  const shareUrlRef = useRef<HTMLInputElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [uploaderUsername, setUploaderUsername] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  
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
      const res = await apiRequest("POST", "/api/comments", comment);
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
      // If user is authenticated, include user ID
      ...(user ? { userId: user.id } : { username: "Anonymous" }),
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
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
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
                    videoUrl={media.vimeoId ? `https://vimeo.com/${media.vimeoId}` : 
                             media.videoUrl ? media.videoUrl : 
                             ''}
                    title={media.title}
                    responsive={true}
                    autoplay={true}
                    aiGenerator={media.aiGenerator}
                  />
                </div>
              )}
              
              {media.contentType === 'image' && media.imageUrl && (
                <div className="flex items-center justify-center bg-black relative">
                  <img 
                    src={media.imageUrl} 
                    alt={media.title} 
                    className="max-w-full max-h-[70vh]" 
                  />
                  {media.aiGenerator && <AIWatermark aiGenerator={media.aiGenerator} position="bottom-right" size="medium" />}
                </div>
              )}
              
              {media.contentType === 'embed' && media.embedCode && (
                <div className="aspect-video">
                  {/* For YouTube embeds, ensure autoplay is forced */}
                  {media.embedCode.includes('youtube.com/embed/') ? (
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{
                        __html: media.embedCode.includes('autoplay=1')
                          ? media.embedCode.includes('origin=') 
                            ? media.embedCode 
                            : media.embedCode.replace(/src="([^"]+)"/, `src="$1&origin=${window.location.origin}"`)
                          : media.embedCode
                              .replace(/src="([^"]+)"/, `src="$1?autoplay=1&enablejsapi=1&origin=${window.location.origin}"`)
                              .replace(/src="([^"]+)\?([^"]*)"/, `src="$1?autoplay=1&enablejsapi=1&origin=${window.location.origin}&$2"`)
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: media.embedCode }}
                    />
                  )}
                </div>
              )}
              
              {!media.vimeoId && !media.videoUrl && !media.imageUrl && !media.embedCode && (
                <div className="aspect-video flex items-center justify-center bg-[#0a0a0a]">
                  <div className="text-gray-500">No media available</div>
                </div>
              )}
            </div>
            
            {/* Media info section */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{media.title}</h1>
              
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    {media.aiGenerator && (
                      <>
                        <span className="text-orange-500">{media.aiGenerator}</span>
                        <span className="text-gray-500">•</span>
                      </>
                    )}
                    <span>Added {new Date(media.createdAt).toLocaleDateString()}</span>
                    {uploaderUsername && (
                      <>
                        <span className="text-gray-500">•</span>
                        <Link 
                          to={`/user/${uploaderUsername}`} 
                          className="text-orange-500 hover:text-orange-400 hover:underline"
                        >
                          {uploaderUsername}
                        </Link>
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
              
              <div className="bg-[#1a1a1a] p-4 rounded-md">
                {media.description && (
                  <p className="text-gray-300 mb-3">{media.description}</p>
                )}
                
                {(media.aiGenerator || media.prompt) && (
                  <div className="border-t border-[#333] pt-3 mt-3">
                    {media.aiGenerator && (
                      <div className="mb-2">
                        <span className="text-sm font-semibold text-gray-400">AI Generator:</span>{" "}
                        <span className="text-gray-300">{media.aiGenerator}</span>
                      </div>
                    )}
                    
                    {media.prompt && (
                      <div>
                        <span className="text-sm font-semibold text-gray-400">Prompt:</span>{" "}
                        <span className="text-gray-300">{media.prompt}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Comments section */}
            <div>
              <h2 className="text-xl font-bold mb-4">
                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
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
        <DialogContent className="bg-[#1a1a1a] border-[#333]">
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
        <DialogContent className="bg-[#1a1a1a] border-[#333]">
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
                  className="flex-1 flex items-center justify-center border-[#333] text-[#0077B5] hover:bg-[#0077B5] hover:text-white hover:border-[#0077B5]"
                  onClick={() => handleSocialShare('linkedin')}
                >
                  <Linkedin className="w-5 h-5 mr-2" />
                  LinkedIn
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