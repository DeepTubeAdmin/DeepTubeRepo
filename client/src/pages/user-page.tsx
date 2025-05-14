import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Video } from "@shared/schema";
import VideoCard from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import MiniFooter from "@/components/MiniFooter";

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
    size: 0,
    resolution: "HD",
    credits: 0,
    prompt: null,
    rejectionReason: null
  } as Video;
};

export default function UserPage() {
  const { username } = useParams<{ username: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

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
      const response = await apiRequest("POST", "/api/messages/send", {
        receiverId: userProfile.id,
        content: messageContent,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to send message: ${response.status} - ${errorText}`);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || "Failed to send message");
        } catch (e) {
          throw new Error(`Failed to send message: ${response.status}`);
        }
      }
      
      setMessageContent("");
      toast({
        title: "Message sent",
        description: `Your message has been sent to ${username}`,
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  // Handle case where profile doesn't exist
  if (profileError) {
    return (
      <Layout>
        <SEO title="User Not Found" />
        <div className="container max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12 bg-gray-800/30 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <p className="text-gray-400">The user you're looking for doesn't exist or has been removed.</p>
            <Button className="mt-6 bg-orange-600 hover:bg-orange-700" onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </div>
        </div>
        <MiniFooter />
      </Layout>
    );
  }
  
  return (
    <Layout>
      <SEO title={`${username}'s Profile`} description={`View ${username}'s uploaded content on DeepTube`} />
      <div className="container max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* User profile section */}
        <div className="mb-12">
          {isLoadingProfile ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : userProfile ? (
            <div className="flex flex-col md:flex-row items-start gap-8 bg-gray-800/30 p-6 rounded-xl">
              <div className="bg-gray-800 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center flex-shrink-0 mx-auto md:mx-0">
                <UserIcon className="h-12 w-12 md:h-16 md:w-16 text-gray-400" />
              </div>
              
              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-center md:text-left">
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
                  
                  <div className="flex items-center bg-gray-800/50 px-3 py-1 rounded text-gray-400 text-sm self-center md:self-start">
                    <UserIcon className="h-4 w-4 mr-2" />
                    {userProfile.isAdmin ? "Administrator" : "Member"}
                  </div>
                </div>
                
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-2 text-center md:text-left">About</h2>
                  <p className="text-gray-300 text-center md:text-left">AI content creator on DeepTube.</p>
                </div>
                
                {/* Direct Message Box */}
                {currentUser?.id !== userProfile.id && (
                  <div className="mt-6 bg-gray-800/50 p-4 rounded-lg shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-md">Send a Message</h3>
                      {currentUser ? null : (
                        <span className="text-xs text-orange-400">
                          <a href="/auth" className="hover:underline">Login</a> to send messages
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Textarea 
                        placeholder={currentUser ? `Write a message to ${username}...` : "Login to send messages"}
                        className="min-h-[60px] text-sm resize-none"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        disabled={!currentUser}
                      />
                      <Button
                        className="bg-orange-600 hover:bg-orange-700 text-white self-end"
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!currentUser || !messageContent.trim() || isSendingMessage}
                      >
                        {isSendingMessage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        
        {/* User content section */}
        <div className="bg-gray-900/50 p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Content</h2>
          
          {isLoadingContent ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : contentError ? (
            <div className="text-center py-12">
              <p className="text-destructive">Error loading content. Please try again.</p>
            </div>
          ) : userContent && userContent.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
      <MiniFooter />
    </Layout>
  );
}