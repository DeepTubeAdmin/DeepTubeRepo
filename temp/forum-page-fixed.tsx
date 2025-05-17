import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import {
  ChevronUp,
  Clock,
  CreditCard,
  FileText,
  Filter,
  MessageCircle,
  MessageSquare,
  Pin,
  Search,
  Trash2,
  User, 
  X
} from "lucide-react";
import { 
  Input
} from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ForumThreadCard from "@/components/ForumThreadCard";

// Define interfaces for forum data types
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
  const [, setLocation] = useLocation();
  
  // State for forum management
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newThreadCategory, setNewThreadCategory] = useState<string>("");
  const [newThreadTags, setNewThreadTags] = useState<string>("");
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [isStickyThreadDialogOpen, setIsStickyThreadDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeThread, setActiveThread] = useState<number | null>(null);
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
    queryKey: ['/api/forum/threads', { categoryId: activeCategory, sortBy }],
  });
  
  // Sort threads to ensure sticky threads appear at the top
  const sortedThreads = useMemo(() => {
    // Separate sticky and non-sticky threads
    const stickyThreads = [...threads].filter(thread => thread.isSticky);
    const nonStickyThreads = [...threads].filter(thread => !thread.isSticky);
    
    // Apply sorting to each group separately
    const sortFunction = (a: ForumThread, b: ForumThread) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "popular") {
        return b.upvotes - a.upvotes;
      } else if (sortBy === "comments") {
        return (b.commentCount || 0) - (a.commentCount || 0);
      }
      return 0;
    };
    
    stickyThreads.sort(sortFunction);
    nonStickyThreads.sort(sortFunction);
    
    // Combine with sticky threads first
    return [...stickyThreads, ...nonStickyThreads];
  }, [threads, sortBy]);

  // Fetch comments for the active thread
  const { 
    data: comments = [], 
    isLoading: isLoadingComments,
    refetch: refetchComments
  } = useQuery<ForumComment[]>({
    queryKey: ['/api/forum/threads', activeThread, 'comments'],
    enabled: activeThread !== null,
  });
  
  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Making API request to:", "/api/forum/threads");
      return await apiRequest("POST", "/api/forum/threads", data);
    },
    onSuccess: () => {
      setNewThreadTitle("");
      setNewThreadContent("");
      setNewThreadCategory("");
      setNewThreadTags("");
      setIsNewThreadDialogOpen(false);
      setIsStickyThreadDialogOpen(false);
      toast({ title: "Thread created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create thread", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });
  
  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Making API request to:", `/api/forum/threads/${activeThread}/comments`);
      return await apiRequest("POST", `/api/forum/threads/${activeThread}/comments`, data);
    },
    onSuccess: () => {
      setNewComment("");
      setVisibleCommentForms({});
      toast({ title: "Comment added successfully" });
      refetchComments();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to add comment", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });
  
  // Upvote thread mutation
  const upvoteThreadMutation = useMutation({
    mutationFn: async (threadId: number) => {
      console.log("Making API request to:", `/api/forum/threads/${threadId}/upvote`);
      return await apiRequest("POST", `/api/forum/threads/${threadId}/upvote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to upvote thread", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });
  
  // Delete thread mutation
  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: number) => {
      console.log("Making API request to:", `/api/forum/threads/${threadId}`);
      return await apiRequest("DELETE", `/api/forum/threads/${threadId}`);
    },
    onSuccess: () => {
      toast({ title: "Thread deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/forum/threads'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete thread", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });
  
  // Handler functions
  const handleCreateThread = () => {
    const parsedTags = newThreadTags ? newThreadTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    createThreadMutation.mutate({
      title: newThreadTitle,
      content: newThreadContent,
      categoryId: newThreadCategory ? parseInt(newThreadCategory) : null,
      tags: parsedTags.length > 0 ? parsedTags : null,
      isSticky: false
    });
  };
  
  const handleCreateStickyThread = () => {
    const parsedTags = newThreadTags ? newThreadTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    createThreadMutation.mutate({
      title: newThreadTitle,
      content: newThreadContent,
      categoryId: newThreadCategory ? parseInt(newThreadCategory) : null,
      tags: parsedTags.length > 0 ? parsedTags : null,
      isSticky: true
    });
  };
  
  const handleCreateComment = () => {
    if (!activeThread) return;
    
    createCommentMutation.mutate({
      content: newComment
    });
  };
  
  const handleUpvoteThread = (threadId: number) => {
    upvoteThreadMutation.mutate(threadId);
  };
  
  const handleDeleteThread = (threadId: number) => {
    deleteThreadMutation.mutate(threadId);
  };
  
  const openCommentForm = (threadId: number) => {
    if (threadId === 0) {
      setVisibleCommentForms({});
      return;
    }
    
    setActiveThread(threadId);
    setVisibleCommentForms({
      ...visibleCommentForms,
      [threadId]: true
    });
  };
  
  // Filter threads based on search query and active category
  const filteredThreads = sortedThreads.filter(thread => {
    // Filter by search query
    const matchesSearch = searchQuery ? 
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      thread.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (thread.tags && thread.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) :
      true;
    
    // Filter by active category
    const matchesCategory = activeCategory ? thread.categoryId === activeCategory : true;
    
    return matchesSearch && matchesCategory;
  });
  
  // Check if user is an admin (ID 1 or 2)
  const isAdmin = user && (user.id === 1 || user.id === 2);

  return (
    <Layout>
      <SEO 
        title="Community Forum" 
        description="Join the discussion in our community forum. Share ideas, ask questions, and connect with other users."
      />
      
      <div className="container py-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Community Forum</h1>
          <div className="flex gap-2">
            <Button onClick={() => setIsNewThreadDialogOpen(true)}>
              New Thread
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => setIsStickyThreadDialogOpen(true)}>
                <Pin className="h-4 w-4 mr-2" />
                New Sticky
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid md:grid-cols-[250px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-4 border">
              <h3 className="font-medium mb-3">Categories</h3>
              <div className="space-y-1">
                <Button 
                  variant={activeCategory === null ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => {
                    setActiveCategory(null);
                    setActiveTab("all");
                  }}
                >
                  All Categories
                </Button>
                {isLoadingCategories ? (
                  <div className="py-4 text-center text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full inline-block mr-2" />
                    Loading...
                  </div>
                ) : (
                  categories.map(category => (
                    <Button 
                      key={category.id}
                      variant={activeCategory === category.id ? "default" : "ghost"}
                      className="w-full justify-start text-left h-auto py-2 pl-4"
                      onClick={() => {
                        setActiveCategory(category.id);
                        setActiveTab(category.name.toLowerCase().replace(/\s+/g, '-'));
                      }}
                    >
                      {category.name}
                      {category.count && (
                        <Badge variant="secondary" className="ml-auto">
                          {category.count}
                        </Badge>
                      )}
                    </Button>
                  ))
                )}
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-4 border">
              <h3 className="font-medium mb-3">Sort By</h3>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sorting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="popular">Most Upvoted</SelectItem>
                  <SelectItem value="comments">Most Comments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-card rounded-lg p-4 border">
              <h3 className="font-medium mb-3">Search</h3>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input 
                  placeholder="Search threads..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* New Thread Dialog */}
            <Dialog open={isNewThreadDialogOpen} onOpenChange={setIsNewThreadDialogOpen}>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create a New Thread</DialogTitle>
                  <DialogDescription>
                    Share your thoughts with the community. Be respectful and follow our guidelines.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input 
                      value={newThreadTitle}
                      onChange={e => setNewThreadTitle(e.target.value)}
                      placeholder="Enter a descriptive title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea 
                      value={newThreadContent}
                      onChange={e => setNewThreadContent(e.target.value)}
                      placeholder="Write your thread content here..."
                      rows={10}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <select 
                        className="w-full p-2 rounded-md border border-input bg-background"
                        value={newThreadCategory}
                        onChange={e => setNewThreadCategory(e.target.value)}
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
                        placeholder="e.g. question, help, tutorial"
                      />
                    </div>
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
            
            {/* New Sticky Thread Dialog (Admin Only) */}
            {isAdmin && (
              <Dialog open={isStickyThreadDialogOpen} onOpenChange={setIsStickyThreadDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create a Sticky Thread</DialogTitle>
                    <DialogDescription>
                      Create an important announcement that will stay at the top of the forum.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input 
                        value={newThreadTitle}
                        onChange={e => setNewThreadTitle(e.target.value)}
                        placeholder="Enter a descriptive title..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content</label>
                      <Textarea 
                        value={newThreadContent}
                        onChange={e => setNewThreadContent(e.target.value)}
                        placeholder="Write your thread content here..."
                        rows={10}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <select 
                          className="w-full p-2 rounded-md border border-input bg-background"
                          value={newThreadCategory}
                          onChange={e => setNewThreadCategory(e.target.value)}
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
          
          {/* Main Content */}
          <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold">
                {activeCategory ? 
                  categories.find(c => c.id === activeCategory)?.name || "Threads" : 
                  "All Threads"}
              </h2>
              
              <div className="flex gap-2">
                {searchQuery && (
                  <div className="bg-muted text-foreground px-3 py-1.5 rounded-md text-sm flex items-center">
                    <span className="mr-1">Search:</span>
                    <span className="font-medium">"{searchQuery}"</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 ml-1"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Thread List */}
            <div className="space-y-4">
              {isLoadingThreads ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 animate-spin mx-auto text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  </div>
                  <p className="text-muted-foreground">Loading forum threads...</p>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-12 bg-muted rounded-lg">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">No threads found</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no discussions matching your current filters.
                  </p>
                  <Button onClick={() => {
                    setSearchQuery("");
                    setActiveCategory(null);
                    setActiveTab("all");
                  }}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                filteredThreads.map(thread => (
                  <Card 
                    key={thread.id} 
                    className={thread.isSticky 
                      ? "border-primary border-2 shadow-md bg-gradient-to-b from-primary/10 to-background" 
                      : ""
                    }
                  >
                    <CardHeader className={`p-4 pb-2 ${thread.isSticky ? "bg-primary/20 rounded-t-lg" : ""}`}>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {thread.isSticky && (
                              <Badge className="bg-primary text-xs font-bold animate-pulse">Sticky</Badge>
                            )}
                            <h3 className="text-lg font-semibold">
                              {thread.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center">
                              <Avatar className="h-5 w-5 mr-1">
                                <AvatarFallback>{thread.user?.username?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              {thread.user?.username || 'Anonymous'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(thread.createdAt), 'MMM d, yyyy')}
                            </span>
                            <span>•</span>
                            <span className="flex items-center">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {thread.commentCount || 0} comment{(thread.commentCount !== 1) ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                      <p className="text-sm whitespace-pre-wrap">{thread.content}</p>
                      
                      {thread.tags && thread.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {thread.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-4 pt-2 flex flex-col">
                      <div className="flex justify-between items-center w-full">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs"
                          onClick={() => handleUpvoteThread(thread.id)}
                        >
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Upvote
                        </Button>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => openCommentForm(thread.id)}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                          
                          {(isAdmin || (user && thread.userId === user.id)) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs text-destructive hover:bg-destructive hover:text-white"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Thread</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this thread? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteThread(thread.id)}
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
                      
                      {/* Comment Form */}
                      {visibleCommentForms[thread.id] && (
                        <div className="mt-4 w-full">
                          <Separator className="mb-4" />
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium">Reply to this thread</h4>
                            <Textarea 
                              placeholder="Write your comment here..."
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              rows={4}
                            />
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openCommentForm(0)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleCreateComment}
                                disabled={!newComment.trim()}
                              >
                                Post Comment
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      <MiniFooter />
    </Layout>
  );
}