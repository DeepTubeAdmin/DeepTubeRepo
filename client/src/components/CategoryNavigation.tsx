import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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
    let iconComponent;
    
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
    <section className="mb-8">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 pb-2">
          {categories.map(category => (
            <Button
              key={category.slug}
              variant="ghost"
              className={`category-item flex-shrink-0 py-2 px-4 rounded-full ${
                activeCategory === category.slug ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
              onClick={() => onCategoryChange(category.slug)}
            >
              {renderIcon(category.icon)}
              {category.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
