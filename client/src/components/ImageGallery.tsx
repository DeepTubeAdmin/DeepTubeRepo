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
  // Increased column counts to match more items per row in the API
  const getColumnClass = () => {
    // Get window width
    if (typeof window === 'undefined') return 'grid-cols-1';
    
    const width = window.innerWidth;
    if (width < 640) return 'grid-cols-1'; // Mobile
    if (width < 768) return 'grid-cols-2'; // Small tablets
    if (width < 1024) return 'grid-cols-3'; // Large tablets/small desktop
    if (width < 1536) return 'grid-cols-3'; // Desktop
    return 'grid-cols-4'; // Large screens - 4 per row for images
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
    <div className="block-container">
      {/* Pornhub-style heading with "view more" link */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold uppercase">{title}</h2>
        {showViewAll && images.length > 0 && (
          <Link to={viewAllUrl} className="text-primary text-sm hover:text-primary/80 uppercase font-bold">
            MORE <span className="ml-1 text-xs">▶</span>
          </Link>
        )}
      </div>
      
      {/* Image grid */}
      <div className={`grid ${columnClass} gap-6 w-full`}>
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
    </div>
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
      className="group thumbnail-item transition-transform duration-200 overflow-hidden cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="relative">
        {/* Thumbnail with hover effect */}
        <AspectRatio ratio={3 / 4} className="bg-black">
          <img
            src={image.thumbnail}
            alt={image.title}
            className="object-cover w-full h-full transition-all duration-300 transform group-hover:scale-110"
          />
        </AspectRatio>
        
        {/* Type badge */}
        <div className="absolute top-2 right-2 bg-black text-primary text-xs font-semibold px-1 py-0.5 rounded-sm">
          <div className="flex items-center">
            <Image className="w-3 h-3 mr-0.5" />
            <span>AI</span>
          </div>
        </div>
        
        {/* View/info overlay - only shows on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        </div>
      </div>
      
      {/* Image info */}
      <div className="pt-2 pb-3 px-1 bg-[#0f172a]">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors cursor-pointer mr-2">
            {image.title}
          </h3>
          <Link to={`/media/${image.id}`} className="text-gray-400 hover:text-primary transition-colors">
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>{(image as any).aiGenerator || "AI Generated"}</span>
          </div>
          
          <button 
            onClick={handleWishlist}
            className="text-gray-400 hover:text-primary transition-colors"
          >
            <Heart className="h-4 w-4" fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}