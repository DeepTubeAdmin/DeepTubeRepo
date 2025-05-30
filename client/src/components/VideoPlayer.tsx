import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import GenericVideoEmbed from "./GenericVideoEmbed";
import AIWatermark from "./AIWatermark";
import { Video } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ThumbsUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EmergencyVideoPlayer from "./EmergencyVideoPlayer";
import S3VideoPlayer from "./S3VideoPlayer";
import S3ImageComponent from "./S3ImageComponent";
import { isRedditEmbed, extractRedditInfo, fetchS3Url } from "@/lib/utils";
import {
  extractYoutubeVideoId,
  extractYoutubeIdFromEmbed,
  youtubeUrlToEmbedCode,
} from "@/lib/youtubeUtils";

interface VideoPlayerProps {
  videoId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoPlayer({
  videoId,
  isOpen,
  onClose,
}: VideoPlayerProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [uploaderUsername, setUploaderUsername] = useState<string>("");
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  // This effect loads the video data
  useEffect(() => {
    if (!isOpen || !videoId) return;

    const fetchVideo = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest("GET", `/api/videos/${videoId}`);
        if (!response.ok) {
          throw new Error(`Error fetching video: ${response.status}`);
        }

        const data = await response.json();
        setVideo(data);

        // Fetch uploader username if video has a userId
        if (data.userId) {
          try {
            const response = await apiRequest(
              "GET",
              `/api/users/${data.userId}/profile`
            );
            const userData = await response.json();
            if (userData && userData.username) {
              setUploaderUsername(userData.username);
            }
          } catch (error) {
            console.error("Error fetching uploader username:", error);
          }
        }
      } catch (err) {
        console.error("Error fetching video:", err);
        setError("Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId, isOpen]);

  // Handle likes
  const handleLike = async () => {
    if (!videoId || isLikeLoading) return;

    setIsLikeLoading(true);
    try {
      if (isLiked) {
        await apiRequest("DELETE", `/api/videos/${videoId}/like`);
        setLikeCount(likeCount - 1);
      } else {
        await apiRequest("POST", `/api/videos/${videoId}/like`);
        setLikeCount(likeCount + 1);
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error("Error toggling like:", err);
      toast({
        title: "Error",
        description: "Could not process your like. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLikeLoading(false);
    }
  };

  console.log("video", video);

  // Return the main component
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 bg-black border-none overflow-hidden">
        <DialogTitle className="sr-only">
          {video?.title || "Video Player"}
        </DialogTitle>
        <div className="relative w-full h-full flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-[50vh]">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[50vh] text-white">
              <div className="text-center">
                <p className="text-lg mb-4">{error}</p>
                <p>Sorry, this video could not be loaded.</p>
              </div>
            </div>
          ) : video ? (
            <>
              <div className="absolute top-2 right-2 z-50">
                <button
                  onClick={onClose}
                  className="bg-black/70 hover:bg-black text-white rounded-full p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="relative flex-grow min-h-[30vh] bg-black">
                {video.contentType === "video" && video.videoUrl && (
                  <S3VideoPlayer
                    videoUrl={video.videoUrl}
                    title={video.title}
                    className="h-full"
                  />
                )}

                {video.contentType === "image" && (
                  <div className="relative h-full flex items-center justify-center bg-black">
                    <S3ImageComponent
                      imageUrl={video.imageUrl || video.thumbnail || ""}
                      alt={video.title}
                      className="max-h-[80vh] max-w-full object-contain"
                    />

                    {video.aiGenerator && (
                      <AIWatermark
                        aiGenerator={video.aiGenerator}
                        position="bottom-right"
                        size="large"
                      />
                    )}
                  </div>
                )}

                {video.contentType === "embed" && (
                  <div className="relative w-full h-0 pb-[56.25%]">
                    <div
                      ref={embedContainerRef}
                      className="absolute top-0 left-0 w-full h-full"
                    >
                      <GenericVideoEmbed html={video.embedCode || ""} />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-background p-4 text-left">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{video.title}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>{video.views || 0} views</span>
                      <span>•</span>
                      {uploaderUsername && (
                        <Link
                          href={`/user/${video.userId}`}
                          className="hover:underline text-primary"
                        >
                          @{uploaderUsername}
                        </Link>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleLike}
                    disabled={isLikeLoading}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                      isLiked
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        isLikeLoading ? "animate-pulse" : ""
                      }`}
                    />
                    <span>{likeCount}</span>
                  </button>
                </div>

                {video.description && (
                  <div className="mt-2 text-sm whitespace-pre-wrap">
                    {video.description}
                  </div>
                )}

                {video.aiGenerator && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">
                      AI Generator:{" "}
                    </span>
                    <span className="text-primary">{video.aiGenerator}</span>
                  </div>
                )}

                {video.prompt && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Prompt: </span>
                    <span className="font-medium">{video.prompt}</span>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
