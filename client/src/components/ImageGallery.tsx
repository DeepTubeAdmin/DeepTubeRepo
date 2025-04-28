import { useState } from "react";
import { Video as SchemaVideo } from "@shared/schema";
import { Video as TypeVideo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { formatNumber } from "@/lib/utils";
import { Heart, Image } from "lucide-react";

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
    <section className="mb-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
    // This would trigger the image preview automatically when hovering
    if (onPreview) {
      onPreview(image.id);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <div 
      id={`video-preview-${image.id}`}
      className="video-card bg-card overflow-hidden rounded-md shadow-sm hover:shadow-md transition-all"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative group">
        <AspectRatio ratio={16 / 9}>
          <img
            src={image.thumbnail}
            alt={image.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${isHovering ? 'opacity-70' : 'opacity-100'}`}
          />
        </AspectRatio>
        
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          <div className="flex items-center">
            <Image className="w-3 h-3 mr-1" />
            <span>AI</span>
          </div>
        </div>
        
        {isHovering && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse">
              <Image className="h-12 w-12 text-white opacity-70" />
            </div>
          </div>
        )}
      </div>
      
      <div className="p-2">
        <h3 
          className="text-sm font-medium line-clamp-1 hover:text-primary transition-colors cursor-pointer"
          onClick={handleClick}
        >
          {image.title}
        </h3>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-xs text-muted-foreground">
            {(image as any).aiGenerator || "AI Generated"}
          </span>
          
          <button 
            onClick={handleWishlist}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}