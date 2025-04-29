import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  
  return (
    <Layout>
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
                <div 
                  className="aspect-video" 
                  dangerouslySetInnerHTML={{ __html: media.embedCode }} 
                />
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
                  {media.views || 0} views • Added {new Date(media.createdAt).toLocaleDateString()}
                </div>
                
                <div className="flex space-x-3">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <ThumbsUp className="w-5 h-5 mr-1" />
                    <span>Like</span>
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
                  <AvatarImage src={user?.avatar || undefined} />
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
                          <span className="font-semibold mr-2">
                            {comment.username || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-gray-300">{comment.text}</p>
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
    </Layout>
  );
}