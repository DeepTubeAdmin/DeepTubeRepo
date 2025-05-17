import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { 
  MessageSquare, 
  Plus, 
  Filter, 
  SortDesc, 
  ChevronUp, 
  ChevronDown,
  ThumbsUp,
  MessageCircle,
  Clock,
  User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Define interfaces for our forum data types
interface ForumCategory {
  id: number;
  name: string;
  count?: number;
}

interface ForumThread {
  id: number;
  title: string;
  content: string;
  userId: number;
  categoryId: number | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
  isSticky: boolean;
  upvotes: number;
  tags: string[] | null;
  user?: {
    id: number;
    username: string;
  };
  commentCount?: number;
}

interface ForumComment {
  id: number;
  threadId: number;
  userId: number;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date | null;
  user?: {
    id: number;
    username: string;
  };
}

export default function ForumPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newThreadCategory, setNewThreadCategory] = useState<number | null>(null);
  const [newThreadTags, setNewThreadTags] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [isStickyThreadDialogOpen, setIsStickyThreadDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeThread, setActiveThread] = useState<number | null>(null);
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [visibleCommentForms, setVisibleCommentForms] = useState<{[key: number]: boolean}>({});
  
  // Fetch forum categories from the database
  const { 
    data: categories = [], 
    isLoading: isLoadingCategories 
  } = useQuery<ForumCategory[]>({
    queryKey: ['/api/forum/categories'],
  });

  // Fetch forum threads
  const { 
    data: threads = [], 
    isLoading: isLoadingThreads,
    refetch: refetchThreads
  } = useQuery<ForumThread[]>({
    queryKey: ['/api/forum/threads', { categoryId: activeCategory, sortBy }]
  });

  // Fetch comments for the active thread
  const { 
    data: comments = [], 
    isLoading: isLoadingComments,
    refetch: refetchComments
  } = useQuery<ForumComment[]>({
    queryKey: ['/api/forum/threads', activeThread, 'comments'],
    queryFn: async () => {
      if (!activeThread) return [];
      const res = await fetch(`/api/forum/threads/${activeThread}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      return res.json();
    },
    enabled: !!activeThread
  });

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async (newThread: { 
      title: string; 
      content: string; 
      categoryId: number | null;
      tags: string[] | null;
      isSticky?: boolean;
    }) => {
      const res = await apiRequest('POST', '/api/forum/threads', newThread);
      return res.json();
    },
    onSuccess: () => {
      // Reset form
      setNewThreadTitle("");
      setNewThreadContent("");
      setNewThreadTags("");
      setIsNewThreadDialogOpen(false);
      
      // Refetch threads
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads'] });
      
      toast({
        title: "Thread created",
        description: "Your new discussion thread has been created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating thread",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ 
      threadId, 
      content 
    }: { 
      threadId: number; 
      content: string;
    }) => {
      const res = await apiRequest('POST', `/api/forum/threads/${threadId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      // Reset form
      setNewComment("");
      
      // Hide the comment form
      if (activeThread) {
        setVisibleCommentForms({
          ...visibleCommentForms,
          [activeThread]: false
        });
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads', activeThread, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads'] });
      
      toast({
        title: "Comment added",
        description: "Your comment has been added to the discussion.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding comment",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete thread mutation
  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: number) => {
      const res = await apiRequest('DELETE', `/api/forum/threads/${threadId}`);
      return res.json();
    },
    onSuccess: () => {
      // Refetch threads
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads'] });
      
      // If the deleted thread was active, clear it
      if (activeThread) {
        setActiveThread(null);
      }
      
      toast({
        title: "Thread deleted",
        description: "The thread has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting thread",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Format timestamps to relative time (e.g., "2 hours ago")
  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // For now just display a toast with the search query
    // We can implement actual search functionality later
    toast({
      title: "Searching threads",
      description: `Searching for: ${searchQuery}`,
    });
  };

  const handleCreateThread = () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your thread.",
        variant: "destructive"
      });
      return;
    }

    const tagsArray = newThreadTags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    createThreadMutation.mutate({
      title: newThreadTitle,
      content: newThreadContent,
      categoryId: newThreadCategory,
      tags: tagsArray.length > 0 ? tagsArray : null,
      isSticky: false
    });
  };
  
  // Handle creating a sticky thread (admin only)
  const handleCreateStickyThread = () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your sticky thread.",
        variant: "destructive"
      });
      return;
    }

    const tagsArray = newThreadTags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    createThreadMutation.mutate({
      title: newThreadTitle,
      content: newThreadContent,
      categoryId: newThreadCategory,
      tags: tagsArray.length > 0 ? tagsArray : null,
      isSticky: true
    });
    
    setIsStickyThreadDialogOpen(false);
  };

  const handleVote = (threadId: number) => {
    // For now, this is just a client-side update
    // We would implement a proper API call in the future
    toast({
      title: "Upvoted thread",
      description: "Thread upvoted successfully!"
    });
  };

  const handleAddComment = (threadId: number) => {
    if (!newComment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter some content for your comment.",
        variant: "destructive"
      });
      return;
    }

    addCommentMutation.mutate({
      threadId,
      content: newComment
    });
  };

  const filteredThreads = threads.filter(thread => {
    // Filter by tab
    if (activeTab === "sticky" && !thread.isSticky) return false;
    
    // Filter by category
    if (activeCategory && thread.categoryId !== activeCategory) return false;
    
    // Filter by search query
    if (searchQuery && !thread.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !thread.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    return true;
  });

  // Sort threads
  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (sortBy === "newest") {
      // Sort by created date, with newer first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "oldest") {
      // Sort by created date, with older first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === "popular") {
      // Sort by upvotes
      return b.upvotes - a.upvotes;
    } else if (sortBy === "comments") {
      // Sort by comment count
      return (b.commentCount || 0) - (a.commentCount || 0);
    }
    return 0;
  });

  // Check if user is an admin (ID 1 or 2)
  const isAdmin = user && (user.id === 1 || user.id === 2);

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async ({ 
      threadId, 
      commentId 
    }: { 
      threadId: number; 
      commentId: number;
    }) => {
      const res = await apiRequest('DELETE', `/api/forum/threads/${threadId}/comments/${commentId}`);
      return res.json();
    },
    onSuccess: () => {
      // Refetch comments and threads (to update comment count)
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads', activeThread, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads'] });
      
      toast({
        title: "Comment deleted",
        description: "The comment has been deleted successfully",
        variant: "destructive"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting comment",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleDeleteComment = (commentId: number, threadId: number) => {
    deleteCommentMutation.mutate({ threadId, commentId });
  };

  const openCommentForm = (threadId: number) => {
    setVisibleCommentForms({...visibleCommentForms, [threadId]: true});
  };

  return (
    <Layout>
      <SEO 
        title="Community Forum | DeepTube: Ethical AI Media Hub"
        description="DeepTube.co: Where innovative creators share responsible AI-powered media. Join our community forum to discuss AI-generated videos, share tips, and connect with other creators."
        canonicalUrl="https://deeptube.co/forum"
        ogType="website"
        keywords="AI media hosting, Responsible AI media, Video hosting platform, DeepTube, AI-powered video, Trusted video content, Creator media platform, AI content sharing"
      />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">DeepTube.co Forum</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar with Categories */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader className="font-bold text-lg pb-2">Categories</CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  <button 
                    className={`text-left px-4 py-2 hover:bg-muted transition-colors ${activeCategory === null ? 'bg-muted font-medium' : ''}`}
                    onClick={() => setActiveCategory(null)}
                  >
                    All Categories
                  </button>
                  {isLoadingCategories ? (
                    <div className="p-4 text-center">
                      <Loader2 className="animate-spin h-5 w-5 mx-auto text-muted-foreground" />
                    </div>
                  ) : (
                    categories.map(category => (
                      <button 
                        key={category.id}
                        className={`text-left px-4 py-2 hover:bg-muted transition-colors flex justify-between ${activeCategory === category.id ? 'bg-muted font-medium' : ''}`}
                        onClick={() => setActiveCategory(category.id)}
                      >
                        <span>{category.name}</span>
                        <span className="bg-muted-foreground/20 text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                          {category.count || 0}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="font-bold text-lg pb-2">Forum Stats</CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Threads:</span>
                  <span className="font-medium">{threads.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Comments:</span>
                  <span className="font-medium">{comments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Users:</span>
                  <span className="font-medium">132</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Forum Content */}
          <div className="md:col-span-3 space-y-6">
            {/* Search and Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full max-w-md">
                <form onSubmit={handleSearch} className="relative w-full">
                  <Input
                    type="text"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
                  >
                    <MessageSquare size={18} />
                  </Button>
                </form>
              </div>
              
              <div className="flex gap-3 ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex gap-2">
                      <SortDesc size={16} />
                      <span>Sort</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSortBy("newest")}>
                      Newest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                      Oldest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("popular")}>
                      Most Popular
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("comments")}>
                      Most Comments
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex gap-2">
                      <Filter size={16} />
                      <span>Filter</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setActiveTab("all")}>
                      All Threads
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab("sticky")}>
                      Sticky Threads
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="flex gap-2">
                  <Dialog open={isNewThreadDialogOpen} onOpenChange={setIsNewThreadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex gap-2">
                        <Plus size={16} />
                        <span>New Thread</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="create-thread-description">
                      <DialogHeader>
                        <DialogTitle>Create a New Discussion Thread</DialogTitle>
                        <p id="create-thread-description" className="text-sm text-muted-foreground">
                          Share your ideas, questions, or insights with the community
                        </p>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Thread Title</label>
                          <Input 
                            value={newThreadTitle}
                            onChange={e => setNewThreadTitle(e.target.value)}
                            placeholder="Enter a descriptive title for your thread"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Thread Content</label>
                          <Textarea 
                            value={newThreadContent}
                            onChange={e => setNewThreadContent(e.target.value)}
                            placeholder="Enter the content of your thread"
                            className="min-h-[200px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Category</label>
                          <select 
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            value={newThreadCategory || ""}
                            onChange={e => setNewThreadCategory(e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">Select a category</option>
                            {categories.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Tags (comma separated)</label>
                          <Input 
                            value={newThreadTags}
                            onChange={e => setNewThreadTags(e.target.value)}
                            placeholder="e.g. question, help, feedback"
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsNewThreadDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateThread} disabled={!newThreadTitle || !newThreadContent}>
                          Create Thread
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {isAdmin && (
                    <Dialog open={isStickyThreadDialogOpen} onOpenChange={setIsStickyThreadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="flex gap-2" variant="outline">
                          <Plus size={16} />
                          <span>Sticky Thread</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="create-sticky-thread-description">
                        <DialogHeader>
                          <DialogTitle>Create a Sticky Thread</DialogTitle>
                          <p id="create-sticky-thread-description" className="text-sm text-muted-foreground">
                            Create an important announcement or discussion that will stay at the top of the forum
                          </p>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Thread Title</label>
                            <Input 
                              value={newThreadTitle}
                              onChange={e => setNewThreadTitle(e.target.value)}
                              placeholder="Enter a descriptive title for your sticky thread"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Thread Content</label>
                            <Textarea 
                              value={newThreadContent}
                              onChange={e => setNewThreadContent(e.target.value)}
                              placeholder="Enter the content of your sticky thread"
                              className="min-h-[200px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <select 
                              className="w-full px-3 py-2 border border-border rounded-md bg-background"
                              value={newThreadCategory || ""}
                              onChange={e => setNewThreadCategory(e.target.value ? Number(e.target.value) : null)}
                            >
                              <option value="">Select a category</option>
                              {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Tags (comma separated)</label>
                            <Input 
                              value={newThreadTags}
                              onChange={e => setNewThreadTags(e.target.value)}
                              placeholder="e.g. announcement, important, update"
                            />
                          </div>
                        </div>
                        <DialogFooter className="mt-6">
                          <Button variant="outline" onClick={() => setIsStickyThreadDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateStickyThread} disabled={!newThreadTitle || !newThreadContent}>
                            Create Sticky Thread
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
            </div>
            
            {/* Thread List */}
            <div className="space-y-4">
              {sortedThreads.length === 0 ? (
                <div className="text-center py-12 bg-muted rounded-lg">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">No threads found</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no discussions matching your current filters.
                  </p>
                  <Button onClick={() => {
                    setActiveCategory(null);
                    setSearchQuery("");
                    setActiveTab("all");
                  }}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                sortedThreads.map(thread => (
                  <Card key={thread.id} className={thread.isSticky ? "border-primary/50" : ""}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {thread.isSticky && (
                            <Badge variant="outline" className="bg-primary/10 text-primary">Sticky</Badge>
                          )}
                          {thread.categoryId && (
                            <Badge>
                              {categories.find(c => c.id === thread.categoryId)?.name || 'Uncategorized'}
                            </Badge>
                          )}
                        </div>
                        <h3 
                          className="text-xl font-medium mt-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setActiveThread(activeThread === thread.id ? null : thread.id)}
                        >
                          {thread.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {thread.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {thread.timestamp}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVote(thread.id)}
                          className="flex flex-col items-center"
                        >
                          <ChevronUp size={18} />
                          <span className="text-xs font-medium">{thread.upvotes}</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className={`${activeThread === thread.id ? '' : 'line-clamp-2'}`}>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {thread.content}
                      </p>
                      {thread.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {thread.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => setActiveThread(activeThread === thread.id ? null : thread.id)}
                      >
                        {activeThread === thread.id ? (
                          <>
                            <ChevronUp size={16} className="mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} className="mr-1" />
                            Show More
                          </>
                        )}
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 text-muted-foreground"
                          onClick={() => openCommentForm(thread.id)}
                        >
                          <MessageCircle size={16} />
                          <span>Reply ({thread.commentCount})</span>
                        </Button>
                        
                        {/* Admin delete thread button */}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                              >
                                <Trash2 size={16} />
                                <span>Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Thread</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this thread? This action cannot be undone 
                                  and all associated comments will also be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteThreadMutation.mutate(thread.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardFooter>
                    
                    {/* Comments section */}
                    {activeThread === thread.id && (
                      <div className="px-6 pb-4 space-y-4">
                        <Separator />
                        
                        {/* Comment form */}
                        {visibleCommentForms[thread.id] && (
                          <div className="mt-4 space-y-3">
                            <Textarea 
                              placeholder={`Reply to ${thread.author}'s thread...`}
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              className="min-h-[100px]"
                            />
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setVisibleCommentForms({...visibleCommentForms, [thread.id]: false})}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleAddComment(thread.id)}
                                disabled={!newComment.trim()}
                              >
                                Post Reply
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Comments list */}
                        <div className="space-y-3 mt-3">
                          <h4 className="font-medium text-sm flex items-center gap-1">
                            <MessageCircle size={14} />
                            Comments ({thread.commentCount})
                          </h4>
                          
                          {comments
                            .filter(comment => comment.threadId === thread.id)
                            .map(comment => (
                              <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback>{comment.author.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm">{comment.author}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                                </div>
                                <p className="text-sm">{comment.content}</p>
                                <div className="flex items-center gap-2 mt-2 justify-between">
                                  <Button variant="ghost" size="sm" className="h-auto py-1 px-2">
                                    <ThumbsUp size={14} className="mr-1" />
                                    <span className="text-xs">{comment.upvotes}</span>
                                  </Button>
                                  
                                  {/* Admin delete comment button */}
                                  {isAdmin && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-auto py-1 px-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                        >
                                          <Trash2 size={14} className="mr-1" />
                                          <span className="text-xs">Delete</span>
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this comment? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => handleDeleteComment(comment.id, thread.id)}
                                            className="bg-destructive hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                          {!visibleCommentForms[thread.id] && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2 w-full"
                              onClick={() => openCommentForm(thread.id)}
                            >
                              <MessageCircle size={14} className="mr-1" />
                              Write a comment
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Add MiniFooter */}
      <MiniFooter />
    </Layout>
  );
}