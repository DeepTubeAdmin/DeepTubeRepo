import { useState } from "react";
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
    <section className="mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
      className="video-card bg-card overflow-hidden rounded-md shadow-md hover:shadow-lg transition-all"
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
        
        {/* Information overlay that only appears on hover */}
        {isHovering && (
          <>
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 transition-all">
              <div className="flex justify-between items-center">
                <h3 
                  className="text-white text-sm font-medium line-clamp-1 hover:text-primary-300 transition-colors cursor-pointer"
                  onClick={handleClick}
                >
                  {image.title}
                </h3>
                <Link to={`/media/${image.id}`} className="text-white/80 hover:text-primary-300 transition-colors ml-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-white/80">
                  {(image as any).aiGenerator || "AI Generated"}
                </span>
                
                <button 
                  onClick={handleWishlist}
                  className="text-white/80 hover:text-primary-300 transition-colors"
                >
                  <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}