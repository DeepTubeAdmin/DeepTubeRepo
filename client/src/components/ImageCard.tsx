import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, ExternalLink, AlertTriangle } from "lucide-react";
import { Video } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReportDialog from "./ReportDialog";
import { createSeoFriendlySlug } from "@/lib/seoUrl";

interface ImageCardProps {
  image: Video;
  size?: "default" | "small" | "medium" | "large";
}

export default function ImageCard({ image, size = "default" }: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [username, setUsername] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUsername = async () => {
      // Check if we already have the uploaderName from the API
      if (image.uploaderName) {
        setUsername(image.uploaderName);
        return;
      }

      // Otherwise fetch the username if we have userId
      if (image.userId) {
        try {
          const response = await apiRequest(
            "GET",
            `/api/users/${image.userId}/profile`
          );
          const data = await response.json();
          if (data && data.username) {
            setUsername(data.username);
          }
        } catch (error) {
          console.error("Error fetching username:", error);
        }
      }
    };
    fetchUsername();
  }, [image.userId, image.uploaderName]);

  const likeMutation = useMutation({
    mutationFn: async (data: { videoId: number }) => {
      const res = await apiRequest("POST", "/api/like", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You liked this content",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/content/feed"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    likeMutation.mutate({ videoId: image.id });
  };

  const handleReportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReportDialog(true);
  };

  // Calculate aspect ratio class
  // Default is 16:9 for flexibility, can be adjusted based on image sizes
  const aspectRatioClass = "aspect-[3/4]"; // Taller/thinner aspect ratio for images

  // Create the class for the card size
  const sizeClass = {
    small: "w-full",
    default: "w-full",
    medium: "w-full",
    large: "w-full max-w-4xl mx-auto",
  }[size];

  // Format view count with K/M for large numbers
  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    } else {
      return count.toString();
    }
  };

  // Display AI model/generator name formatted nicely
  const formatAIGenerator = (generator: string): string => {
    // Common abbreviations that should stay uppercase
    const uppercaseTerms = ["ai", "sd", "xl", "v2", "v3", "mlx"];

    return generator
      .split(/[ -_]+/)
      .map((part) => {
        if (uppercaseTerms.includes(part.toLowerCase())) {
          return part.toUpperCase();
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(" ");
  };

  return (
    <>
      <div
        className={`${sizeClass} group relative rounded-lg overflow-hidden bg-black/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg shadow-orange-500/20`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link href={`/media/${createSeoFriendlySlug(image)}`}>
          <div
            className={`${aspectRatioClass} bg-slate-800 relative overflow-hidden`}
          >
            {/* Thumbnail */}
            <img
              src={image.thumbnail || "/placeholder-image.svg"}
              alt={image.title}
              className="h-full w-full object-contain bg-gray-900"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder-image.svg";
              }}
            />

            {/* Watermark for AI generated content */}
            {image.aiGenerator && (
              <div className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium text-orange-500 bg-black/40 rounded drop-shadow-lg">
                {formatAIGenerator(image.aiGenerator)}
              </div>
            )}

            {/* Overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-80"
              }`}
            />

            {/* Info overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white transition-all duration-300 transform translate-y-0 group-hover:translate-y-0">
              <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                {image.title}
              </h3>

              {/* Tags display */}
              {image.tags && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {image.tags
                    .split(",")
                    .slice(0, 2)
                    .map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block bg-gray-800/80 text-gray-300 rounded px-1.5 py-0.5 text-[10px]"
                      >
                        #{tag.trim()}
                      </span>
                    ))}
                  {image.tags.split(",").length > 2 && (
                    <span className="inline-block text-gray-400 text-[10px]">
                      +{image.tags.split(",").length - 2}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <span style={{ color: "#9333ea" }}>
                    {image.categoryName || "Category"}{" "}
                  </span>
                  <span>•</span>
                  <span>{image.aiGenerator || "AI Generated"}</span>
                  {username && (
                    <>
                      <span>•</span>
                      <Link
                        to={`/user/${username}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-orange-400 hover:underline">
                          {username}
                        </span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex space-x-1">
              <button
                onClick={handleLikeClick}
                className="p-1.5 rounded-full bg-black/50 text-white hover:bg-orange-600 transition-colors"
              >
                <Heart size={16} />
              </button>
              <button
                onClick={handleReportClick}
                className="p-1.5 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors"
              >
                <AlertTriangle size={16} />
              </button>
            </div>

            {/* External link indicator for embeds */}
            {image.contentType === "embed" && (
              <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/50 text-white">
                <ExternalLink size={16} />
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Report Dialog */}
      {showReportDialog && (
        <ReportDialog
          contentId={image.id}
          contentTitle={image.title}
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
        />
      )}
    </>
  );
}
