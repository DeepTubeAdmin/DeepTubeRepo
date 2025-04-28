import { useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { formatDistance } from 'date-fns';
import VimeoEmbed from '@/components/VimeoEmbed';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { extractVideoId } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, Clock, Info, MessageSquare, Image as ImageIcon, Link as LinkIcon, Video as VideoIcon } from 'lucide-react';

// Define the structure of media item and comment
type DetailedMedia = {
  id: number;
  title: string;
  description?: string;
  thumbnail: string;
  credits: number;
  resolution: "HD" | "4K";
  duration: number;
  contentType?: "video" | "image" | "embed";
  categoryId?: number;
  category?: { id: number; name: string; slug: string };
  vimeoId?: string;
  videoUrl?: string;
  imageUrl?: string;
  embedCode?: string;
  aiGenerator?: string;
  prompt?: string;
  createdAt: string;
  comments: Comment[];
  isWishlisted?: boolean;
};

type Comment = {
  id: number;
  videoId: number;
  username: string;
  userId?: number;
  content: string;
  createdAt: string;
};

export default function MediaDetail() {
  const [, params] = useRoute<{ id: string }>('/media/:id');
  const id = params?.id ? parseInt(params.id) : null;
  
  const [commentText, setCommentText] = useState('');
  const [username, setUsername] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Query for media details
  const { data: media, isLoading, error } = useQuery<DetailedMedia>({
    queryKey: [`/api/videos/${id}`],
    enabled: !!id,
  });
  
  // Mutation for posting comments
  const commentMutation = useMutation({
    mutationFn: async ({ videoId, username, content }: { videoId: number; username: string; content: string }) => {
      const response = await apiRequest('POST', `/api/videos/${videoId}/comments`, { username, content });
      return response.json();
    },
    onSuccess: () => {
      // Reset form
      setCommentText('');
      if (!user) setUsername('');
      
      // Show success toast
      toast({
        title: 'Comment posted',
        description: 'Your comment has been posted successfully.',
      });
      
      // Invalidate queries to reload comments
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${id}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post comment.',
        variant: 'destructive',
      });
    },
  });
  
  // Wishlist mutation
  const wishlistMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const method = media?.isWishlisted ? 'DELETE' : 'POST';
      await apiRequest(method, `/api/videos/${videoId}/wishlist`);
    },
    onSuccess: () => {
      // Invalidate media data to refetch
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${id}`] });
      
      toast({
        title: media?.isWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
        description: media?.isWishlisted 
          ? 'The item has been removed from your wishlist.' 
          : 'The item has been added to your wishlist.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update wishlist.',
        variant: 'destructive',
      });
    },
  });
  
  const handleCommentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!id) return;
    
    // Make sure we have comment text
    if (!commentText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a comment.',
        variant: 'destructive',
      });
      return;
    }
    
    // For anonymous users, make sure they entered a username
    if (!user && !username.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a username.',
        variant: 'destructive',
      });
      return;
    }
    
    // Submit comment
    commentMutation.mutate({
      videoId: id,
      username: user ? user.username : username,
      content: commentText
    });
  };
  
  const handleWishlistToggle = () => {
    if (!id || !user) {
      toast({
        title: 'Login required',
        description: 'Please log in to add items to your wishlist.',
        variant: 'destructive',
      });
      return;
    }
    
    wishlistMutation.mutate(id);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error || !media) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p>Sorry, we couldn't load this content. It may not exist or has been removed.</p>
        <Button className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }
  
  // Extract Vimeo ID if available
  const vimeoId = media.vimeoId || 
    (media.videoUrl ? extractVideoId(media.videoUrl) : null);
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{media.title}</h1>
          
          {/* Media display */}
          <div className="mb-6 bg-black rounded-lg overflow-hidden">
            {media.contentType === 'image' ? (
              <AspectRatio ratio={16/9}>
                <img 
                  src={media.thumbnail} 
                  alt={media.title} 
                  className="w-full h-full object-contain" 
                />
              </AspectRatio>
            ) : media.contentType === 'embed' && media.embedCode ? (
              <div className="relative w-full aspect-video">
                <div 
                  className="absolute inset-0 w-full h-full"
                  dangerouslySetInnerHTML={{ __html: media.embedCode }} 
                />
              </div>
            ) : (
              vimeoId ? (
                <VimeoEmbed 
                  videoId={vimeoId} 
                  title={media.title} 
                  responsive 
                  autoplay
                />
              ) : (
                <AspectRatio ratio={16/9}>
                  <img 
                    src={media.thumbnail} 
                    alt={media.title} 
                    className="w-full h-full object-cover" 
                  />
                </AspectRatio>
              )
            )}
          </div>
          
          {/* Media info */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4">
              {media.category && (
                <Badge variant="outline" className="text-xs">
                  {media.category.name}
                </Badge>
              )}
              
              {media.contentType && (
                <Badge variant="outline" className="text-xs flex gap-1 items-center">
                  {media.contentType === 'image' ? <ImageIcon className="h-3 w-3" /> : 
                   media.contentType === 'embed' ? <LinkIcon className="h-3 w-3" /> :
                   <VideoIcon className="h-3 w-3" />}
                  {media.contentType === 'image' 
                    ? 'Image' 
                    : media.contentType === 'embed' 
                      ? 'Embed' 
                      : 'Video'}
                </Badge>
              )}
              
              {media.resolution && (
                <Badge variant="outline" className="text-xs">
                  {media.resolution}
                </Badge>
              )}
              
              {media.duration > 0 && (
                <span className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {Math.floor(media.duration / 60)}:{(media.duration % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWishlistToggle}
              disabled={wishlistMutation.isPending}
              className={`${media.isWishlisted ? 'text-red-500' : ''}`}
            >
              <Heart className="h-4 w-4 mr-1" fill={media.isWishlisted ? "currentColor" : "none"} />
              {media.isWishlisted ? 'Saved' : 'Save'}
            </Button>
          </div>
          
          {/* Description */}
          {media.description && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{media.description}</p>
              </CardContent>
            </Card>
          )}
          
          {/* AI Info Section */}
          {(media.aiGenerator || media.prompt) && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  AI Generation Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                {media.aiGenerator && (
                  <div className="mb-2">
                    <h4 className="text-sm font-semibold mb-1">AI Generator</h4>
                    <p className="text-sm">{media.aiGenerator}</p>
                  </div>
                )}
                
                {media.prompt && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Prompt Used</h4>
                    <p className="text-sm bg-muted p-2 rounded whitespace-pre-line">{media.prompt}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Comments Section */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments
              {media.comments?.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({media.comments.length})
                </span>
              )}
            </h2>
            
            {/* Comment form */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Add a comment</CardTitle>
                <CardDescription>
                  {user ? `Commenting as ${user.username}` : 'Comment anonymously'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCommentSubmit}>
                  {!user && (
                    <div className="mb-4">
                      <Input
                        placeholder="Your name"
                        value={username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  <Textarea
                    placeholder="Write your comment here..."
                    value={commentText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentText(e.target.value)}
                    className="w-full min-h-[100px]"
                  />
                  
                  <Button 
                    type="submit" 
                    className="mt-4"
                    disabled={commentMutation.isPending}
                  >
                    {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            {/* Comments list */}
            {media.comments && media.comments.length > 0 ? (
              <div className="space-y-4">
                {media.comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{comment.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{comment.username}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {comment.createdAt && formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-line">{comment.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">About This Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {media.createdAt && (
                <div>
                  <h3 className="text-sm font-semibold">Added</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDistance(new Date(media.createdAt), new Date(), { addSuffix: true })}
                  </p>
                </div>
              )}
              
              {media.credits !== undefined && (
                <div>
                  <h3 className="text-sm font-semibold">Credits</h3>
                  <p className="text-sm text-muted-foreground">{media.credits}</p>
                </div>
              )}
              
              {media.category && (
                <div>
                  <h3 className="text-sm font-semibold">Category</h3>
                  <p className="text-sm text-muted-foreground">{media.category.name}</p>
                </div>
              )}
              
              {media.resolution && (
                <div>
                  <h3 className="text-sm font-semibold">Resolution</h3>
                  <p className="text-sm text-muted-foreground">{media.resolution}</p>
                </div>
              )}
              
              {media.contentType && (
                <div>
                  <h3 className="text-sm font-semibold">Type</h3>
                  <p className="text-sm text-muted-foreground capitalize">{media.contentType}</p>
                </div>
              )}
              
              {media.duration > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Duration</h3>
                  <p className="text-sm text-muted-foreground">
                    {Math.floor(media.duration / 60)}m {media.duration % 60}s
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}