import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Play } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { Video } from "@/types";
import { useState } from "react";

interface VideoCardProps {
  video: Video;
  onPreview?: (videoId: number) => void;
  onWishlist?: (videoId: number) => void;
}

export default function VideoCard({ video, onPreview, onWishlist }: VideoCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    if (onWishlist) {
      onWishlist(video.id);
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(video.id);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="video-card bg-card overflow-hidden shadow-lg">
      <div className="relative">
        <AspectRatio ratio={16/9}>
          <img
            src={video.thumbnail}
            alt={video.title}
            className="object-cover w-full h-full"
          />
        </AspectRatio>
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {video.resolution}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50">
          <Button 
            className="bg-primary text-primary-foreground font-bold rounded-full"
            onClick={handlePreview}
          >
            <Play className="mr-1 h-4 w-4" /> Preview
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="video-title font-medium text-card-foreground truncate hover:text-primary">
          {video.title}
        </h3>
        <div className="flex justify-between items-center mt-1">
          <div className="text-muted-foreground text-sm">
            {formatDuration(video.duration)}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "text-muted-foreground hover:text-primary",
              isWishlisted && "text-primary"
            )}
            onClick={handleWishlist}
          >
            <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
