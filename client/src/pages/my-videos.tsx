import { useState, useEffect } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { checkThumbnail } from "@/lib/checkThumbnail";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Video } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Eye, MessageCircle, Edit, Upload, ExternalLink } from "lucide-react";
import { formatNumber } from "@/lib/utils";

// Extended Video type with category information
type VideoWithCategory = Video & {
  category?: {
    id: number;
    name: string;
    slug: string;
  };
};

export default function MyVideosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [videoToDelete, setVideoToDelete] = useState<number | null>(null);
  const [videoToEdit, setVideoToEdit] = useState<VideoWithCategory | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const {
    data: videos,
    isLoading,
    error,
  } = useQuery<VideoWithCategory[]>({
    queryKey: ['/api/user/videos'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const response = await apiRequest("DELETE", `/api/videos/${videoId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video deleted",
        description: "Your video has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/videos'] });
      setVideoToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete video: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ videoId, title, description }: { videoId: number; title: string; description: string }) => {
      const response = await apiRequest("PUT", `/api/videos/${videoId}`, {
        title,
        description,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video updated",
        description: "Your video has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/videos'] });
      setVideoToEdit(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update video: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const confirmDelete = (videoId: number) => {
    setVideoToDelete(videoId);
  };
  
  const handleDelete = () => {
    if (videoToDelete) {
      deleteMutation.mutate(videoToDelete);
    }
  };
  
  const closeDialog = () => {
    setVideoToDelete(null);
  };

  const openEditModal = (video: VideoWithCategory) => {
    setVideoToEdit(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
  };

  const handleEdit = () => {
    if (videoToEdit) {
      editMutation.mutate({
        videoId: videoToEdit.id,
        title: editTitle,
        description: editDescription,
      });
    }
  };

  const closeEditModal = () => {
    setVideoToEdit(null);
    setEditTitle('');
    setEditDescription('');
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Badge variant="secondary" className="mb-2"><Upload className="h-3 w-3 mr-1" /> Video</Badge>;
      case 'image':
        return <Badge variant="secondary" className="mb-2"><Upload className="h-3 w-3 mr-1" /> Image</Badge>;
      case 'embed':
        return <Badge variant="secondary" className="mb-2"><Upload className="h-3 w-3 mr-1" /> Embed</Badge>;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <Layout>
        <SEO 
          title="My Videos | DeepTube: Ethical AI Media Hub"
          description="Manage your uploaded AI-generated videos and images on DeepTubeAI.com. View your media statistics, edit details, and control your content sharing preferences."
          canonicalUrl="https://www.deeptubeai.com/my-videos"
          ogType="website"
          keywords="My videos, uploaded content, content management, DeepTube, AI-powered video, content creator, media dashboard"
        />
        <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your videos</h1>
          <Button onClick={() => setLocation("/auth")}>Go to Login</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title="My Videos | DeepTube: Ethical AI Media Hub"
        description="Manage your uploaded AI-generated videos and images on DeepTubeAI.com. View your media statistics, edit details, and control your content sharing preferences."
        canonicalUrl="https://www.deeptubeai.com/my-videos"
        ogType="website"
        keywords="My videos, uploaded content, content management, DeepTube, AI-powered video, content creator, media dashboard"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Videos</h1>
          <Button onClick={() => window.history.back()}>Back</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Error loading your videos. Please try again.</p>
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-48">
                  <img 
                    src={checkThumbnail(video.thumbnail || '', video.id)} 
                    alt={video.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(`Error loading thumbnail for video ${video.id}`);
                      e.currentTarget.src = `/api/content/${video.id}/thumbnail?placeholder=true&t=${Date.now()}`;
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    {getContentTypeIcon(video.contentType)}
                  </div>
                </div>
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-xl line-clamp-1">{video.title}</CardTitle>
                  </div>
                  {video.category && (
                    <Badge variant="outline" className="mt-1">
                      {video.category.name}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="pb-3">
                  {video.description && (
                    <CardDescription className="line-clamp-2">
                      {video.description}
                    </CardDescription>
                  )}
                  
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>Uploaded: {new Date(video.createdAt).toLocaleDateString()}</p>
                    {video.contentType === 'video' && video.duration && video.duration > 0 && (
                      <p>Duration: {Math.floor(video.duration / 60)}m {Math.floor(video.duration % 60)}s</p>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between pt-1 border-t">
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setLocation(`/media/${video.id}`)}
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Details</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditModal(video)}
                          >
                            <Edit className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Video</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/media/${video.id}`} className="inline-flex">
                            <Button variant="ghost" size="icon">
                              <MessageCircle className="h-5 w-5" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Comments</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => confirmDelete(video.id)}
                          >
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <Link 
                    href={`/media/${video.id}`} 
                    className="flex items-center text-sm text-primary font-medium"
                  >
                    Open <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <h2 className="text-xl font-semibold mb-2">You haven't uploaded any videos yet</h2>
            <p className="text-muted-foreground mb-6">Start by uploading a video, image, or embedding content from YouTube.</p>
            <Button onClick={() => setLocation("/")}>
              Go to Homepage
            </Button>
          </div>
        )}
      </div>
      
      {/* Edit Video Modal */}
      <Dialog open={videoToEdit !== null} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>
              Update the title and description for your video.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter video title"
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter video description"
                rows={4}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeEditModal}
              disabled={editMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEdit}
              disabled={editMutation.isPending || !editTitle.trim()}
            >
              {editMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={videoToDelete !== null} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              video and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}