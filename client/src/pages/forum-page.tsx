import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
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

// Mock data for the forum posts
const forumCategories = [
  { id: 1, name: "AI Video Generation", count: 35 },
  { id: 2, name: "AI Image Creation", count: 42 },
  { id: 3, name: "Tutorials & Guides", count: 23 },
  { id: 4, name: "Show & Tell", count: 57 },
  { id: 5, name: "Questions & Help", count: 29 },
  { id: 6, name: "News & Updates", count: 18 },
];

const initialThreads = [
  {
    id: 1,
    title: "Best AI video generator in 2025?",
    author: "AIMaster",
    category: "AI Video Generation",
    content: "What are your thoughts on the best AI video generator currently available? I've been trying Synthesia but wondering what else is out there.",
    timestamp: "2 hours ago",
    upvotes: 34,
    commentCount: 12,
    tags: ["video", "tools", "comparison"],
    isSticky: true,
  },
  {
    id: 2,
    title: "How to create photorealistic images with AI",
    author: "PixelPerfect",
    category: "AI Image Creation",
    content: "I'm trying to create photorealistic portrait images but still getting uncanny valley results. Any tips or specific settings to use?",
    timestamp: "5 hours ago",
    upvotes: 21,
    commentCount: 8,
    tags: ["image", "photorealistic", "tutorial"],
    isSticky: false,
  },
  {
    id: 3,
    title: "Just created my first AI music video!",
    author: "MusicMaker",
    category: "Show & Tell",
    content: "After weeks of trying, I finally created my first full AI-generated music video. Check it out and let me know what you think!",
    timestamp: "1 day ago",
    upvotes: 56,
    commentCount: 24,
    tags: ["music", "video", "showcase"],
    isSticky: false,
  },
  {
    id: 4,
    title: "Understanding prompt engineering for better results",
    author: "PromptWizard",
    category: "Tutorials & Guides",
    content: "I've put together a comprehensive guide on prompt engineering techniques that have dramatically improved my AI generation results.",
    timestamp: "2 days ago",
    upvotes: 102,
    commentCount: 43,
    tags: ["prompt", "guide", "tips"],
    isSticky: false,
  },
  {
    id: 5,
    title: "BREAKING: New AI model released with 8K video capability",
    author: "TechNews",
    category: "News & Updates",
    content: "A new AI model was just released that supports native 8K video generation with incredible detail levels. This could be a game changer!",
    timestamp: "3 days ago",
    upvotes: 87,
    commentCount: 31,
    tags: ["news", "8K", "model"],
    isSticky: true,
  },
];

const mockComments = [
  { id: 1, threadId: 1, author: "AIEnthusiast", content: "I've been using Synthesia as well but recently switched to RunwayML. The quality difference is night and day!", timestamp: "1 hour ago", upvotes: 12 },
  { id: 2, threadId: 1, author: "VideoProducer", content: "Synthesia is great for talking head videos, but for more creative stuff I recommend Runway or even Midjourney's new video features.", timestamp: "1.5 hours ago", upvotes: 8 },
  { id: 3, threadId: 1, author: "Beginner123", content: "I find Synthesia easier to use as a beginner. The others have a steeper learning curve but better results if you know what you're doing.", timestamp: "1.75 hours ago", upvotes: 5 },
];

export default function ForumPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [threads, setThreads] = useState(initialThreads);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newThreadCategory, setNewThreadCategory] = useState(1);
  const [newThreadTags, setNewThreadTags] = useState("");
  const [newComment, setNewComment] = useState("");
  const [activeThread, setActiveThread] = useState<number | null>(null);
  const [comments, setComments] = useState(mockComments);
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [visibleCommentForms, setVisibleCommentForms] = useState<{[key: number]: boolean}>({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    toast({
      title: "Searching threads",
      description: `Searching for: ${searchQuery}`,
    });
  };

  const handleCreateThread = () => {
    // In a real app, this would send a POST request to the backend
    const newThread = {
      id: threads.length + 1,
      title: newThreadTitle,
      author: user ? user.username : "Anonymous",
      category: forumCategories.find(c => c.id === newThreadCategory)?.name || "General",
      content: newThreadContent,
      timestamp: "Just now",
      upvotes: 0,
      commentCount: 0,
      tags: newThreadTags.split(",").map(tag => tag.trim()),
      isSticky: false,
    };

    setThreads([newThread, ...threads]);
    setNewThreadTitle("");
    setNewThreadContent("");
    setNewThreadTags("");
    setIsNewThreadDialogOpen(false);

    toast({
      title: "Thread created",
      description: "Your new discussion thread has been created successfully!",
    });
  };

  const handleVote = (threadId: number) => {
    // Update the upvote count
    setThreads(
      threads.map(thread =>
        thread.id === threadId ? { ...thread, upvotes: thread.upvotes + 1 } : thread
      )
    );
  };

  const handleAddComment = (threadId: number) => {
    if (!newComment.trim()) return;

    // In a real app, this would send a POST request to the backend
    const comment = {
      id: comments.length + 1,
      threadId,
      author: user ? user.username : "Anonymous",
      content: newComment,
      timestamp: "Just now",
      upvotes: 0,
    };

    setComments([...comments, comment]);
    
    // Update comment count in thread
    setThreads(
      threads.map(thread =>
        thread.id === threadId ? { ...thread, commentCount: thread.commentCount + 1 } : thread
      )
    );

    setNewComment("");
    setVisibleCommentForms({...visibleCommentForms, [threadId]: false});

    toast({
      title: "Comment added",
      description: "Your comment has been added to the thread",
    });
  };

  const filteredThreads = threads.filter(thread => {
    // Filter by tab
    if (activeTab === "sticky" && !thread.isSticky) return false;
    
    // Filter by category
    if (activeCategory && forumCategories.find(c => c.name === thread.category)?.id !== activeCategory) return false;
    
    // Filter by search query
    if (searchQuery && !thread.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !thread.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    return true;
  });

  // Sort threads
  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (sortBy === "newest") {
      // Simple sorting by id for mock data (higher id = newer)
      return b.id - a.id;
    } else if (sortBy === "oldest") {
      return a.id - b.id;
    } else if (sortBy === "popular") {
      return b.upvotes - a.upvotes;
    } else if (sortBy === "comments") {
      return b.commentCount - a.commentCount;
    }
    return 0;
  });

  const openCommentForm = (threadId: number) => {
    setVisibleCommentForms({...visibleCommentForms, [threadId]: true});
  };

  return (
    <Layout>
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
                  {forumCategories.map(category => (
                    <button 
                      key={category.id}
                      className={`text-left px-4 py-2 hover:bg-muted transition-colors flex justify-between ${activeCategory === category.id ? 'bg-muted font-medium' : ''}`}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      <span>{category.name}</span>
                      <span className="bg-muted-foreground/20 text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                        {category.count}
                      </span>
                    </button>
                  ))}
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
                
                <Dialog open={isNewThreadDialogOpen} onOpenChange={setIsNewThreadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex gap-2">
                      <Plus size={16} />
                      <span>New Thread</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create a New Discussion Thread</DialogTitle>
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
                        <label className="text-sm font-medium">Category</label>
                        <select 
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={newThreadCategory}
                          onChange={e => setNewThreadCategory(Number(e.target.value))}
                        >
                          {forumCategories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Thread Content</label>
                        <Textarea 
                          value={newThreadContent}
                          onChange={e => setNewThreadContent(e.target.value)}
                          placeholder="Share your thoughts, questions, or ideas..."
                          rows={6}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tags (comma separated)</label>
                        <Input 
                          value={newThreadTags}
                          onChange={e => setNewThreadTags(e.target.value)}
                          placeholder="ai, video, tutorial"
                        />
                        <p className="text-xs text-muted-foreground">
                          Tags help others find your thread. Separate multiple tags with commas.
                        </p>
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
                          <Badge>{thread.category}</Badge>
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
                                <div className="flex items-center gap-2 mt-2">
                                  <Button variant="ghost" size="sm" className="h-auto py-1 px-2">
                                    <ThumbsUp size={14} className="mr-1" />
                                    <span className="text-xs">{comment.upvotes}</span>
                                  </Button>
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
    </Layout>
  );
}