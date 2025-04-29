import { useState, useEffect } from "react";
import { Video as SchemaVideo } from "@shared/schema";
import { Video as TypeVideo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { formatNumber } from "@/lib/utils";
import { Heart, Image, ExternalLink } from "lucide-react";
import { Link } from "wouter";

type ImageType = SchemaVideo | TypeVideo;

interface ImageGalleryProps {
  title: string;
  images: ImageType[];
  onPreview?: (imageId: number) => void;
  onWishlist?: (imageId: number) => void;
  showViewAll?: boolean;
  viewAllUrl?: string;
}

export default function ImageGallery({
  title,
  images,
  onPreview,
  onWishlist,
  showViewAll = false,
  viewAllUrl = '#',
}: ImageGalleryProps) {
  return (
    <section className="mb-6">
      {/* YouTube-style section heading with title and optional view all link */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">{title}</h2>
        {showViewAll && images.length > 0 && (
          <Link to={viewAllUrl} className="text-primary text-sm hover:underline">
            View all
          </Link>
        )}
      </div>
      
      {/* YouTube-style list layout */}
      <div className="flex flex-col space-y-4">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onPreview={onPreview}
            onWishlist={onWishlist}
          />
        ))}
      </div>
    </section>
  );
}

interface ImageCardProps {
  image: ImageType;
  onPreview?: (imageId: number) => void;
  onWishlist?: (imageId: number) => void;
}

function ImageCard({ image, onPreview, onWishlist }: ImageCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleClick = () => {
    if (onPreview) {
      onPreview(image.id);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    if (onWishlist) {
      onWishlist(image.id);
    }
  };
  
  const handleMouseEnter = () => {
    setIsHovering(true);
    // We don't want to call onPreview here as it triggers the popup
    // Instead, image hover effect is handled directly in this component
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <div 
      id={`video-preview-${image.id}`}
      className="overflow-hidden rounded-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Thumbnail section - YouTube style */}
        <div className="relative group rounded-lg overflow-hidden">
          <AspectRatio ratio={16/9} className="w-full sm:w-[180px] md:w-[240px] lg:w-[360px]">
            <img
              src={image.thumbnail}
              alt={image.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${isHovering ? 'opacity-80' : 'opacity-100'}`}
            />
          </AspectRatio>
          
          <div className="absolute top-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded text-[10px] font-medium">
            <div className="flex items-center">
              <Image className="w-3 h-3 mr-0.5" />
              <span>AI</span>
            </div>
          </div>
        </div>
        
        {/* Content section - YouTube style */}
        <div className="px-2 sm:px-0 py-2 flex-1">
          <div className="flex gap-3">
            {/* Title and details */}
            <div className="flex-1">
              <h3 
                className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                onClick={handleClick}
              >
                {image.title}
              </h3>
              <div className="flex gap-1 items-center mt-1 text-xs text-muted-foreground">
                <span>{(image as any).aiGenerator || "AI Generated"}</span>
                <span>•</span>
                <span>{Math.floor(Math.random() * 100) + 1}K views</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link to={`/media/${image.id}`} className="text-muted-foreground hover:text-primary transition-colors">
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button 
                onClick={handleWishlist}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}