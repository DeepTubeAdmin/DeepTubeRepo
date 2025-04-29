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
  // Create a function to get the optimal column count based on available width
  const getColumnClass = () => {
    // Get window width
    if (typeof window === 'undefined') return 'grid-cols-1';
    
    const width = window.innerWidth;
    if (width < 640) return 'grid-cols-1'; // Mobile
    if (width < 768) return 'grid-cols-2'; // Small tablets
    if (width < 1024) return 'grid-cols-3'; // Large tablets/small desktop
    if (width < 1280) return 'grid-cols-4'; // Medium desktop
    return 'grid-cols-5'; // Large desktop
  };

  // Create a dynamic class that adjusts to screen width
  const [columnClass, setColumnClass] = useState(getColumnClass());
  
  // Update column class when window is resized
  useEffect(() => {
    const handleResize = () => {
      setColumnClass(getColumnClass());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <section className="mb-4">
      <div className={`grid ${columnClass} gap-4 w-full`}>
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onPreview={onPreview}
            onWishlist={onWishlist}
          />
        ))}
        
        {/* Add empty placeholder items to fill the last row completely */}
        {images.length > 0 && images.length % (parseInt(columnClass.split('-')[2]) || 1) !== 0 && 
          Array.from({ length: parseInt(columnClass.split('-')[2]) - (images.length % parseInt(columnClass.split('-')[2])) }).map((_, i) => (
            <div key={`placeholder-${i}`} className="h-0 invisible"></div>
          ))
        }
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
        
        <div className="absolute top-3 right-3 bg-black/70 text-white text-sm px-2 py-1 rounded">
          <div className="flex items-center">
            <Image className="w-4 h-4 mr-1" />
            <span>AI</span>
          </div>
        </div>
        
        {/* Information overlay that only appears on hover */}
        {isHovering && (
          <>
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 transition-all">
              <div className="flex justify-between items-start">
                <h3 
                  className="text-white text-base font-medium line-clamp-2 hover:text-primary-300 transition-colors cursor-pointer mr-2"
                  onClick={handleClick}
                >
                  {image.title}
                </h3>
                <Link to={`/media/${image.id}`} className="text-white/80 hover:text-primary-300 transition-colors mt-1">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-white/80">
                  {(image as any).aiGenerator || "AI Generated"}
                </span>
                
                <button 
                  onClick={handleWishlist}
                  className="text-white/80 hover:text-primary-300 transition-colors"
                >
                  <Heart className="h-5 w-5" fill={isWishlisted ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}