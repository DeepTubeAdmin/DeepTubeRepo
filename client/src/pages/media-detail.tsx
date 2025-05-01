import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Video, Comment } from "@shared/schema";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Heart, Flag, Share, MessageSquare, ThumbsUp, Flag as FlagIcon } from "lucide-react";
import VimeoEmbed from "@/components/VimeoEmbed";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateVideoStructuredData, generateImageStructuredData } from "@/lib/structuredData";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function MediaDetail() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const [commentText, setCommentText] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
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
              {media.contentType === 'video' && media.vimeoId && (
                <div className="aspect-video">
                  <VimeoEmbed 
                    videoId={media.vimeoId}
                    responsive={true}
                    autoplay={true}
                  />
                </div>
              )}
              
              {media.contentType === 'video' && media.videoUrl && !media.vimeoId && (
                <div className="aspect-video flex items-center justify-center">
                  <video 
                    src={media.videoUrl} 
                    controls 
                    className="w-full h-full" 
                    autoPlay
                  />
                </div>
              )}
              
              {media.contentType === 'image' && media.imageUrl && (
                <div className="flex items-center justify-center bg-black">
                  <img 
                    src={media.imageUrl} 
                    alt={media.title} 
                    className="max-w-full max-h-[70vh]" 
                  />
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
                          ? media.embedCode
                          : media.embedCode
                              .replace(/src="([^"]+)"/, 'src="$1?autoplay=1"')
                              .replace(/src="([^"]+)\?([^"]*)"/, 'src="$1?autoplay=1&$2"')
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
                  
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
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
            {/* Related content would go here - we'll implement this in another task */}
            <div className="text-center py-6 bg-[#1a1a1a] rounded-md">
              <p className="text-gray-400">Related content coming soon</p>
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
      
      {/* Add MiniFooter */}
      <MiniFooter />
    </Layout>
  );
}