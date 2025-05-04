import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  advertiser: string;
}

interface AdvertisementCardProps {
  ad: Advertisement;
  className?: string;
  contentType?: 'videos' | 'images'; // Specify if this ad is in a video or image section
}

// Hardcoded sample ads that will be randomly selected
const SAMPLE_ADS: Advertisement[] = [
  {
    id: 'ad1',
    title: 'Generate AI Videos in Minutes',
    description: 'Create professional-looking videos with AI avatars. No camera needed!',
    imageUrl: 'https://placehold.co/640x360/222/FF6600?text=AI+Video+Creator',
    targetUrl: 'https://www.synthesia.io/?via=deeptube',
    advertiser: 'Synthesia'
  },
  {
    id: 'ad2',
    title: 'Pro-Level Image Generation',
    description: 'Transform your ideas into stunning visuals with our advanced AI.',
    imageUrl: 'https://placehold.co/640x360/222/FF6600?text=AI+Image+Generator',
    targetUrl: 'https://www.midjourney.com/',
    advertiser: 'MidJourney'
  },
  {
    id: 'ad3',
    title: 'Build Your Own AI Assistant',
    description: 'Create, train and deploy powerful AI assistants for your business.',
    imageUrl: 'https://placehold.co/640x360/222/FF6600?text=AI+Assistant+Builder',
    targetUrl: 'https://openai.com/',
    advertiser: 'OpenAI'
  },
  {
    id: 'ad4',
    title: 'Upgrade Your AI Tools',
    description: 'Get premium AI features and unlimited generation credits.',
    imageUrl: 'https://placehold.co/640x360/222/FF6600?text=Premium+AI+Tools',
    targetUrl: 'https://www.replit.com/',
    advertiser: 'DeepTube Pro'
  },
  {
    id: 'ad5',
    title: 'Learn AI Content Creation',
    description: 'Master the art of prompt engineering and AI media generation.',
    imageUrl: 'https://placehold.co/640x360/222/FF6600?text=AI+Content+Course',
    targetUrl: 'https://www.udemy.com/',
    advertiser: 'AI Academy'
  }
];

// Function to get a random advertisement
export function getRandomAd(): Advertisement {
  const randomIndex = Math.floor(Math.random() * SAMPLE_ADS.length);
  return SAMPLE_ADS[randomIndex];
}

export default function AdvertisementCard({ ad, className = '', contentType = 'videos' }: AdvertisementCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  
  const handleClick = () => {
    window.open(ad.targetUrl, '_blank');
  };
  
  // Determine the container classes based on content type
  // For videos, use video card styling with larger thumbnails
  // For images, use image card styling with smaller thumbnails
  const containerClasses = contentType === 'videos' 
    ? 'video-card advertisement-card thumbnail-item relative rounded overflow-hidden mt-6'
    : 'image-card advertisement-card thumbnail-item relative rounded overflow-hidden mt-6';
  
  // Determine the thumbnail height based on content type
  const thumbnailClasses = contentType === 'videos'
    ? 'thumbnail-container relative overflow-hidden aspect-video h-52 sm:h-56 md:h-60 lg:h-64'
    : 'thumbnail-container relative overflow-hidden aspect-square h-40 sm:h-44 md:h-48 lg:h-52';
  
  return (
    <div 
      className={`${containerClasses} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className={thumbnailClasses}>
        {/* Ad thumbnail */}
        <img 
          src={ad.imageUrl}
          alt={ad.title} 
          className="w-full h-full object-cover"
        />
        
        {/* Badge to indicate this is an ad */}
        <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-sm font-semibold">
          AD
        </div>
        
        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 text-center">
            <h3 className="text-lg font-bold text-white mb-2">{ad.title}</h3>
            <p className="text-sm text-gray-200 mb-4">{ad.description}</p>
            <Button 
              variant="secondary" 
              className="bg-primary hover:bg-primary/90 text-white border-none"
              onClick={handleClick}
            >
              Learn More <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Ad info */}
      <div className="p-3 bg-[#0f172a]">
        <h3 className="font-medium text-base md:text-lg truncate">{ad.title}</h3>
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <div className="flex items-center space-x-2">
            <span>{ad.advertiser}</span>
            <span className="text-orange-500 text-xs font-bold">SPONSORED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
