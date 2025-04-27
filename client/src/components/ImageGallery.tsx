import { useState } from "react";
import { Video } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { formatNumber } from "@/lib/utils";
import { Heart, Image } from "lucide-react";

interface ImageGalleryProps {
  title: string;
  images: Video[];
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
    <div className="py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {showViewAll && (
          <a href={viewAllUrl} className="text-primary hover:underline">
            View All
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {images.filter(img => img.contentType === "image").map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onPreview={onPreview}
            onWishlist={onWishlist}
          />
        ))}
      </div>
    </div>
  );
}

interface ImageCardProps {
  image: Video;
  onPreview?: (imageId: number) => void;
  onWishlist?: (imageId: number) => void;
}

function ImageCard({ image, onPreview, onWishlist }: ImageCardProps) {
  const [isHovering, setIsHovering] = useState(false);

  const handleClick = () => {
    if (onPreview) {
      onPreview(image.id);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWishlist) {
      onWishlist(image.id);
    }
  };

  return (
    <div
      className="rounded-lg overflow-hidden bg-card shadow-md hover:shadow-lg transition-all cursor-pointer relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleClick}
    >
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          <img
            src={image.thumbnail}
            alt={image.title}
            className="w-full h-full object-cover"
          />
        </AspectRatio>
        
        <Badge className="absolute top-2 right-2 bg-black/60 text-white">
          <Image className="w-3 h-3 mr-1" />
          AI Image
        </Badge>
        
        {onWishlist && (
          <button
            onClick={handleWishlist}
            className="absolute bottom-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-primary transition-colors"
          >
            <Heart className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 h-10">{image.title}</h3>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-muted-foreground">
            {image.aiGenerator || "AI Generated"}
          </span>
        </div>
      </div>
    </div>
  );
}