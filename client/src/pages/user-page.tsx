import { useEffect, useState } from "react";
import { useParams } from "wouter";
import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Send, User } from "lucide-react";
import ImageGallery from "@/components/ImageGallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Video, User as UserType } from "@shared/schema";

// Define message type
interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  senderName?: string;
  read: boolean;
}

export default function UserPage() {
  const params = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [userImages, setUserImages] = useState<Video[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch user profile and content
  useEffect(() => {
    if (!params.username) return;

    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        // Fetch user profile by username
        const response = await apiRequest(
          "GET",
          `/api/users/by-username/${params.username}`
        );
        const data = await response.json();
        setUserProfile(data);

        // Fetch user videos and images
        if (data.id) {
          const videosResponse = await apiRequest(
            "GET",
            `/api/users/${data.id}/content`
          );
          const contentData = await videosResponse.json();
          
          // Separate videos and images
          setUserVideos(contentData.filter((item: Video) => 
            item.contentType === 'video' || item.contentType === 'embed'
          ));
          setUserImages(contentData.filter((item: Video) => 
            item.contentType === 'image'
          ));
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [params.username, toast]);

  // Fetch messages when dialog opens
  const handleOpenMessageDialog = async () => {
    if (!currentUser || !userProfile) return;
    
    setMessageDialogOpen(true);
    setLoadingMessages(true);
    
    try {
      const response = await apiRequest(
        "GET",
        `/api/messages/${userProfile.id}`
      );
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!currentUser || !userProfile || !messageText.trim()) return;
    
    setSendingMessage(true);
    
    try {
      const response = await apiRequest("POST", "/api/messages", {
        receiverId: userProfile.id,
        content: messageText,
      });
      
      const newMessage = await response.json();
      setMessages([...messages, newMessage]);
      setMessageText("");
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <SEO 
          title="Loading User Profile | DeepTube: Ethical AI Media Hub"
          description="DeepTube.co: View creative profiles and user-generated content on the ethical AI media platform."
          canonicalUrl={`https://deeptube.co/user/${params.username}`}
          ogType="profile"
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MiniFooter />
      </Layout>
    );
  }

  if (!userProfile) {
    return (
      <Layout>
        <SEO 
          title="User Not Found | DeepTube: Ethical AI Media Hub"
          description="DeepTube.co: This user profile could not be found."
          canonicalUrl={`https://deeptube.co/user/${params.username}`}
          ogType="profile"
        />
        <div className="container max-w-4xl py-16 text-center">
          <h1 className="text-3xl font-bold mb-4 text-white">User Not Found</h1>
          <p className="text-gray-400 mb-8">The user profile you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
        <MiniFooter />
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={`${userProfile.username}'s Profile | DeepTube: Ethical AI Media Hub`}
        description={`View ${userProfile.username}'s uploaded content on DeepTube.co, the ethical AI media platform.`}
        canonicalUrl={`https://deeptube.co/user/${params.username}`}
        ogType="profile"
      />
      
      <div className="container max-w-5xl py-8">
        {/* User profile header */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="flex-shrink-0">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-2 border-gray-800">
              <AvatarFallback className="bg-primary/20 text-primary text-2xl md:text-4xl">
                {userProfile.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-grow text-center md:text-left">
            <h1 className="text-3xl font-bold text-white mb-2">{userProfile.username}</h1>
            <p className="text-gray-400 mb-4">Member since {new Date(userProfile.createdAt || Date.now()).toLocaleDateString()}</p>
            
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {/* Content stats */}
              <div className="bg-[#272727] rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-primary text-xl font-semibold">{userVideos.length}</span>
                <span className="text-gray-400">Videos</span>
              </div>
              
              <div className="bg-[#272727] rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-primary text-xl font-semibold">{userImages.length}</span>
                <span className="text-gray-400">Images</span>
              </div>
              
              {/* Message button only shown if logged in and not viewing own profile */}
              {currentUser && currentUser.id !== userProfile.id && (
                <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30"
                      onClick={handleOpenMessageDialog}
                    >
                      <Mail size={18} />
                      Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a1a1a] border-gray-800 max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-white">Message {userProfile.username}</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Send a private message to this user.
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Message history */}
                    <div className="max-h-[300px] overflow-y-auto bg-[#111] rounded-md p-4 mb-4 space-y-3">
                      {loadingMessages ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : messages.length > 0 ? (
                        messages.map((message) => (
                          <div 
                            key={message.id}
                            className={`p-3 rounded-lg max-w-[85%] ${message.senderId === currentUser.id 
                              ? 'ml-auto bg-primary/20 text-white' 
                              : 'bg-gray-800 text-gray-300'}`}
                          >
                            <div className="text-xs text-gray-500 mb-1">
                              {message.senderId === currentUser.id ? 'You' : userProfile.username} • 
                              {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <p>{message.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Message input */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message here..."
                        className="min-h-[60px] bg-[#272727] border-gray-700 resize-none"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                      />
                      <Button 
                        size="icon" 
                        className="bg-primary text-black hover:bg-primary/90"
                        disabled={sendingMessage || !messageText.trim()}
                        onClick={handleSendMessage}
                      >
                        {sendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={20} />}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
        
        {/* Content tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="bg-[#272727] p-1 rounded-lg mb-6 w-full max-w-md mx-auto flex">
            <TabsTrigger 
              value="videos" 
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold rounded"
            >
              Videos ({userVideos.length})
            </TabsTrigger>
            <TabsTrigger 
              value="images" 
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold rounded"
            >
              Images ({userImages.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="videos" className="mt-0">
            {userVideos.length > 0 ? (
              <ImageGallery 
                title="" 
                images={userVideos} 
                onPreview={(videoId) => console.log("Preview video", videoId)} 
              />
            ) : (
              <div className="text-center py-16 bg-[#1a1a1a] rounded-xl">
                <User size={48} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Videos Yet</h3>
                <p className="text-gray-400">This user hasn't uploaded any videos yet.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="images" className="mt-0">
            {userImages.length > 0 ? (
              <ImageGallery 
                title="" 
                images={userImages} 
                onPreview={(imageId) => console.log("Preview image", imageId)} 
              />
            ) : (
              <div className="text-center py-16 bg-[#1a1a1a] rounded-xl">
                <User size={48} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Images Yet</h3>
                <p className="text-gray-400">This user hasn't uploaded any images yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <MiniFooter />
    </Layout>
  );
}
