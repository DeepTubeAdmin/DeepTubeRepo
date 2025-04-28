import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import VimeoEmbed from './VimeoEmbed';
import { Video } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  videoId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoPlayer({ videoId, isOpen, onClose }: VideoPlayerProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("VideoPlayer: Effect triggered with videoId:", videoId, "isOpen:", isOpen);
    if (!isOpen || !videoId) return;

    const fetchVideo = async () => {
      console.log("VideoPlayer: Fetching video with ID:", videoId);
      setLoading(true);
      setError(null);
      
      try {
        console.log("VideoPlayer: Making API request to /api/videos/" + videoId);
        const response = await apiRequest('GET', `/api/videos/${videoId}`);
        const data = await response.json();
        console.log("VideoPlayer: Received video data:", data);
        setVideo(data);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>{error}</p>
          </div>
        ) : video ? (
          <div className="space-y-4">
            <div className="rounded-md overflow-hidden">
              {video.vimeoId ? (
                <VimeoEmbed
                  videoId={video.vimeoId}
                  title={video.title}
                  autoplay={true}
                  responsive={true}
                  showTitle={false}
                  showByline={false}
                  showPortrait={false}
                />
              ) : video.contentType === 'embed' && video.embedCode ? (
                <div className="aspect-video w-full">
                  <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: video.embedCode }} 
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center text-muted-foreground">
                  No video available
                </div>
              )}
            </div>
            
            <div className="px-2">
              <h2 className="text-xl font-semibold">{video.title}</h2>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                  {video.resolution}
                </span>
                <span className="text-xs text-muted-foreground">
                  AI Generated
                </span>
                {video.aiGenerator && (
                  <span className="text-xs text-muted-foreground">
                    with {video.aiGenerator}
                  </span>
                )}
              </div>
              
              {video.prompt && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-1">Prompt</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{video.prompt}</p>
                </div>
              )}
              
              {video.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{video.description}</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}