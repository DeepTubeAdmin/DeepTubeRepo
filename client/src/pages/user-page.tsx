import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { User, Video } from "@shared/schema";
import VideoCard from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";

type UserProfile = {
  id: number;
  username: string;
  createdAt: string;
  isAdmin: boolean;
};

type UserContent = {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  contentType: "video" | "image" | "embed";
  aiGenerator?: string;
  videoUrl?: string;
  imageUrl?: string;
  embedCode?: string;
  createdAt?: string;
  username: string;
};

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  read: boolean;
  senderName?: string;
  receiverName?: string;
};

// Helper function to convert UserContent to Video type
const convertToVideoType = (content: UserContent, userProfile: UserProfile | undefined): Video => {
  return {
    id: content.id,
    title: content.title,
    description: content.description || null,
    thumbnail: content.thumbnail || "",
    contentType: content.contentType,
    aiGenerator: content.aiGenerator || null,
    videoUrl: content.videoUrl || null,
    imageUrl: content.imageUrl || null,
    embedCode: content.embedCode || null,
    createdAt: content.createdAt ? new Date(content.createdAt) : new Date(),
    userId: userProfile?.id || null,
    // Adding required fields with default values
    categoryId: 0,
    reviewStatus: "approved",
    views: 0,
    duration: 0,
    featured: false,
    size: 0,
    resolution: "HD",
    credits: 0,
    prompt: null,
    rejectionReason: null,
  };
};

export default function UserPage() {
  const { username } = useParams<{ username: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Fetch user profile data
  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useQuery<UserProfile>({
    queryKey: ["/api/users/by-username", username],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/by-username/${username}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!username,
  });
  
  // Fetch user content
  const { data: userContent, isLoading: isLoadingContent, error: contentError } = useQuery<UserContent[]>({
    queryKey: ["/api/users/content", userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) throw new Error("User ID not available");
      const response = await apiRequest("GET", `/api/users/${userProfile.id}/content`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user content: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!userProfile?.id,
  });
  
  const handlePreviewClick = (videoId: number) => {
    navigate(`/media/${videoId}`);
  };
  
  const handleSendMessage = async () => {
    if (!messageContent.trim() || !currentUser || !userProfile) {
      return;
    }
    
    setIsSendingMessage(true);
    
    try {
      const response = await apiRequest("POST", "/api/messages", {
        receiverId: userProfile.id,
        content: messageContent,
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      setMessageContent("");
      setIsMessageDialogOpen(false);
      toast({
        title: "Message sent",
        description: `Your message has been sent to ${username}`,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  // Handle case where profile doesn't exist
  if (profileError) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-gray-400">The user you're looking for doesn't exist or has been removed.</p>
          <Button className="mt-6" onClick={() => navigate("/")}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-6xl py-12">
      {/* User profile section */}
      <div className="mb-12">
        {isLoadingProfile ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : userProfile ? (
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="bg-gray-800 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center flex-shrink-0">
              <UserIcon className="h-12 w-12 md:h-16 md:w-16 text-gray-400" />
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{userProfile.username}</h1>
                  <p className="text-gray-400 mt-1">
                    Joined {new Date(userProfile.createdAt).toLocaleDateString()}
                  </p>
                  {userProfile.isAdmin && (
                    <span className="bg-orange-950 text-orange-400 text-xs px-2 py-1 rounded mt-2 inline-block">
                      Admin
                    </span>
                  )}
                </div>
                
                {currentUser && currentUser.id !== userProfile.id && (
                  <Button 
                    onClick={() => setIsMessageDialogOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                )}
              </div>
              
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">About</h2>
                <p className="text-gray-300">AI content creator on DeepTube.</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* User content section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Content</h2>
        
        {isLoadingContent ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : contentError ? (
          <div className="text-center py-12">
            <p className="text-destructive">Error loading content. Please try again.</p>
          </div>
        ) : userContent && userContent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {userContent.map((content) => (
              <VideoCard
                key={content.id}
                video={convertToVideoType(content, userProfile)}
                onPreview={() => handlePreviewClick(content.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400">This user hasn't uploaded any content yet.</p>
          </div>
        )}
      </div>
      
      {/* Message dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send message to {username}</DialogTitle>
            <DialogDescription>
              Your message will be delivered to {username}'s inbox. They'll be able to reply to you.  
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Textarea
              placeholder="Type your message here..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMessageDialogOpen(false)}
              disabled={isSendingMessage}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || isSendingMessage}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSendingMessage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>Send</>  
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}