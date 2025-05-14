import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, MessageSquare, User as UserIcon, Send, MoreVertical, Trash2, ShieldBan } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

type Conversation = {
  userId: number;
  username: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
};

export default function MyMessages() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [confirmBlockDialogOpen, setConfirmBlockDialogOpen] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<number | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Fetch user's conversations
  const { data: conversations, isLoading: isLoadingConversations, refetch: refetchConversations, error: conversationsError } = 
    useQuery<Conversation[]>({
      queryKey: ["/api/messages/conversations"],
      queryFn: async () => {
        console.log("Fetching conversations with user:", user?.id);
        const response = await apiRequest("GET", "/api/messages/conversations");
        
        // Log response status for debugging
        console.log("Conversations response status:", response.status);
        
        if (response.status === 401) {
          console.warn("Not authenticated, will redirect to login");
          navigate("/auth");
          return []; // Return empty array to avoid error
        }
        
        if (!response.ok) {
          console.error("Failed to fetch conversations:", await response.text());
          throw new Error("Failed to fetch conversations");
        }
        
        const data = await response.json();
        console.log("Received conversations data:", data);
        return data;
      },
      enabled: !!user,
      retry: false,
      onError: (error) => {
        console.error("Error fetching conversations:", error);
      }
    });

  // Fetch specific conversation messages
  const { data: messages, isLoading: isLoadingMessages, refetch: refetchMessages, error: messagesError } = 
    useQuery<Message[]>({
      queryKey: ["/api/messages/conversation", activeConversation],
      queryFn: async () => {
        if (!activeConversation) {
          console.log("No active conversation selected");
          return [];
        }
        
        console.log(`Fetching messages for conversation with user ${activeConversation}`);
        const response = await apiRequest("GET", `/api/messages/conversation/${activeConversation}`);
        
        console.log("Messages response status:", response.status);
        
        if (response.status === 401) {
          console.warn("Not authenticated, will redirect to login");
          navigate("/auth");
          return []; // Return empty array to avoid error
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch messages: ${response.status} - ${errorText}`);
          throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Received messages data:", data);
        return data;
      },
      enabled: !!activeConversation && !!user,
      retry: false,
      onError: (error) => {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error loading messages",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    });

  // Mutation for deleting a conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/messages/conversation/${userId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete conversation: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Reset active conversation if it was the one deleted
      if (activeConversation === selectedUserForAction) {
        setActiveConversation(null);
      }
      
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      
      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete conversation",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for blocking a user
  const blockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/users/block/${userId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to block user: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Reset active conversation if it was the one with the blocked user
      if (activeConversation === selectedUserForAction) {
        setActiveConversation(null);
      }
      
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      
      toast({
        title: "User blocked",
        description: "The user has been blocked successfully. You will no longer receive messages from them.",
      });
    },
    onError: (error) => {
      console.error("Error blocking user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to block user",
        variant: "destructive",
      });
    }
  });
  
  // Handle delete conversation action
  const handleDeleteConversation = (userId: number) => {
    setSelectedUserForAction(userId);
    setConfirmDeleteDialogOpen(true);
  };
  
  // Handle confirm delete conversation
  const confirmDeleteConversation = () => {
    if (selectedUserForAction) {
      setIsProcessingAction(true);
      deleteConversationMutation.mutate(selectedUserForAction, {
        onSettled: () => {
          setIsProcessingAction(false);
          setConfirmDeleteDialogOpen(false);
          setSelectedUserForAction(null);
        }
      });
    }
  };
  
  // Handle block user action
  const handleBlockUser = (userId: number) => {
    setSelectedUserForAction(userId);
    setConfirmBlockDialogOpen(true);
  };
  
  // Handle confirm block user
  const confirmBlockUser = () => {
    if (selectedUserForAction) {
      setIsProcessingAction(true);
      blockUserMutation.mutate(selectedUserForAction, {
        onSettled: () => {
          setIsProcessingAction(false);
          setConfirmBlockDialogOpen(false);
          setSelectedUserForAction(null);
        }
      });
    }
  };
  
  // Mark messages as read when viewing a conversation
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (activeConversation && user) {
        try {
          await apiRequest("POST", `/api/messages/mark-read/${activeConversation}`);
          // Refetch conversations to update unread counts
          refetchConversations();
        } catch (error) {
          console.error("Failed to mark messages as read:", error);
        }
      }
    };

    markMessagesAsRead();
  }, [activeConversation, user, refetchConversations]);

  const handleSendReply = async () => {
    if (!replyContent.trim() || !activeConversation || !user) {
      return;
    }

    setIsSendingReply(true);

    try {
      console.log("Sending message to user:", activeConversation);
      const response = await apiRequest("POST", "/api/messages/send", {
        receiverId: activeConversation,
        content: replyContent,
      });

      if (response.status === 401) {
        console.warn("Not authenticated when sending message, will redirect to login");
        navigate("/auth");
        throw new Error("Authentication required to send messages");
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to send message: ${response.status} - ${errorText}`);
        throw new Error(`Failed to send message: ${errorText || response.statusText}`);
      }

      setReplyContent("");
      // Refetch messages to include the new message
      refetchMessages();
      refetchConversations();

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!user) {
    return null; // Will redirect to auth page via useEffect
  }

  return (
    <Layout>
      <SEO 
        title="My Messages" 
        description="View and manage your conversations with other users on DeepTube"
      />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center md:text-left">My Messages</h1>
        
        {/* Delete conversation confirmation dialog */}
        <Dialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Conversation</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setConfirmDeleteDialogOpen(false)}
                disabled={isProcessingAction}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteConversation}
                disabled={isProcessingAction}
              >
                {isProcessingAction ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                ) : (
                  <>Delete</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Block user confirmation dialog */}
        <Dialog open={confirmBlockDialogOpen} onOpenChange={setConfirmBlockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block User</DialogTitle>
              <DialogDescription>
                Are you sure you want to block this user? They will no longer be able to send you messages,
                and you will not see any of their content. You can unblock them later in your account settings.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setConfirmBlockDialogOpen(false)}
                disabled={isProcessingAction}
              >
                Cancel
              </Button>
              <Button 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={confirmBlockUser}
                disabled={isProcessingAction}
              >
                {isProcessingAction ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Blocking...</>
                ) : (
                  <>Block User</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <div className="bg-[#121212] rounded-lg overflow-hidden max-w-5xl mx-auto shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[70vh]">
            {/* Conversation list */}
            <div className="border-r border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-xl font-semibold">Conversations</h2>
              </div>
              <div className="overflow-y-auto h-[calc(70vh-64px)]">
                {isLoadingConversations ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : !conversations || conversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Messages from other users will appear here</p>
                  </div>
                ) : (
                  <div>
                    {conversations.map((conversation) => (
                      <div 
                        key={conversation.userId}
                        className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                          activeConversation === conversation.userId ? 'bg-gray-800/70' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="bg-gray-700 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 cursor-pointer"
                            onClick={() => setActiveConversation(conversation.userId)}
                          >
                            <UserIcon className="h-5 w-5 text-gray-300" />
                          </div>
                          <div 
                            className="flex-1 min-w-0 cursor-pointer" 
                            onClick={() => setActiveConversation(conversation.userId)}
                          >
                            <div className="flex justify-between items-baseline">
                              <h3 className="font-medium truncate">{conversation.username}</h3>
                              <span className="text-xs text-gray-500">
                                {new Date(conversation.lastMessageDate).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 truncate">{conversation.lastMessage}</p>
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center h-5 w-5 text-xs bg-orange-600 text-white rounded-full mt-1">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="ml-1 mt-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteConversation(conversation.userId)}
                                  className="text-red-500 focus:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete conversation
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleBlockUser(conversation.userId)}
                                  className="text-orange-500 focus:text-orange-500"
                                >
                                  <ShieldBan className="h-4 w-4 mr-2" />
                                  Block user
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Message area */}
            <div className="col-span-2 flex flex-col h-full">
              {!activeConversation ? (
                <div className="flex items-center justify-center h-full text-center text-gray-500">
                  <div>
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-xl font-medium mb-2">Your Messages</h3>
                    <p>Select a conversation to view messages</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Message header */}
                  <div className="p-4 border-b border-gray-800">
                    <h2 className="text-xl font-semibold">
                      {conversations?.find(c => c.userId === activeConversation)?.username || 'Conversation'}
                    </h2>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {isLoadingMessages ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                      </div>
                    ) : !messages || messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation by sending a message</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isSentByMe = message.senderId === user.id;
                          
                          return (
                            <div 
                              key={message.id}
                              className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                            >
                              <div 
                                className={`max-w-[75%] rounded-lg p-3 ${isSentByMe ? 
                                  'bg-blue-600 text-white' : 
                                  'bg-gray-800 text-gray-200'}`}
                              >
                                <p>{message.content}</p>
                                <p className={`text-xs mt-1 ${isSentByMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                  {new Date(message.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Message input */}
                  <div className="p-4 border-t border-gray-800">
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Type your message..."
                        className="min-h-[60px] bg-gray-800 border-gray-700"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleSendReply}
                        disabled={!replyContent.trim() || isSendingReply}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        {isSendingReply ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <MiniFooter />
    </Layout>
  );
}
