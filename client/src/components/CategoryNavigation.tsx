import { Category } from "@/types";
import * as Icons from "lucide-react";

interface CategoryNavigationProps {
  categories: Category[];
  activeCategory?: string;
  onCategoryChange: (slug: string) => void;
}

export default function CategoryNavigation({ 
  categories, 
  activeCategory,
  onCategoryChange 
}: CategoryNavigationProps) {
  // Function to render the appropriate icon
  const renderIcon = (iconName: string) => {
    // Special cases for emoji icons
    if (iconName === '🔥' || iconName === '👁️') {
      return <span className="mr-1">{iconName}</span>;
    }
    
    // Map common icon names to Lucide icon components
    switch (iconName.toLowerCase()) {
      case 'rocket':
        return <Icons.Rocket className="h-4 w-4 mr-1" />;
      case 'smile':
        return <Icons.Smile className="h-4 w-4 mr-1" />;
      case 'film':
        return <Icons.Film className="h-4 w-4 mr-1" />;
      case 'skull':
        return <Icons.Skull className="h-4 w-4 mr-1" />;
      case 'zap':
        return <Icons.Zap className="h-4 w-4 mr-1" />;
      case 'cloud-rain':
        return <Icons.CloudRain className="h-4 w-4 mr-1" />;
      case 'book':
        return <Icons.Book className="h-4 w-4 mr-1" />;
      case 'baby':
        return <Icons.Baby className="h-4 w-4 mr-1" />;
      case 'users':
        return <Icons.Users className="h-4 w-4 mr-1" />;
      case 'leaf':
        return <Icons.Leaf className="h-4 w-4 mr-1" />;
      case 'music':
        return <Icons.Music className="h-4 w-4 mr-1" />;
      case 'heart':
        return <Icons.Heart className="h-4 w-4 mr-1" />;
      default:
        return <Icons.Tag className="h-4 w-4 mr-1" />;
    }
  };
  
  return (
    <div className="bg-black sticky top-14 z-40 shadow-md">
      <div className="container mx-auto">
        <div className="nav-tabs px-4">
          {categories.map(category => (
            <div 
              key={category.slug}
              className={`nav-tab cursor-pointer ${activeCategory === category.slug ? 'active' : ''}`}
              onClick={() => onCategoryChange(category.slug)}
            >
              {renderIcon(category.icon)}
              {category.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
