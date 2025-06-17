import { Category } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  // Add a horizontal scroll effect
  const scrollLeft = () => {
    const tabsContainer = document.querySelector('.nav-tabs');
    if (tabsContainer) {
      tabsContainer.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const tabsContainer = document.querySelector('.nav-tabs');
    if (tabsContainer) {
      tabsContainer.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#0f0f0f] sticky top-14 z-40 shadow-md py-2">
      <div className="container mx-auto flex items-center">
        {/* Left scroll button */}
        <button 
          onClick={scrollLeft}
          className="flex-shrink-0 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center transition-all shadow-lg backdrop-blur-sm mr-2"
          aria-label="Scroll left"
        >
          <ChevronLeft className="text-white" size={20} strokeWidth={2.5} />
        </button>
        
        {/* Scrollable tabs */}
        <div className="nav-tabs flex-1 overflow-x-auto flex items-center space-x-2 py-1">
          {/* All Categories option */}
          <div 
            className={`px-4 py-1.5 rounded-full cursor-pointer transition-all ${
              !activeCategory 
                ? 'bg-primary text-white font-medium' 
                : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#252525]'
            }`}
            onClick={() => onCategoryChange('')}
          >
            All Categories
          </div>
          
          {/* Category options */}
          {categories.map(category => (
            <div 
              key={category.slug}
              className={`px-4 py-1.5 rounded-full cursor-pointer transition-all ${
                activeCategory === category.slug 
                  ? 'bg-primary text-white font-medium' 
                  : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#252525]'
              }`}
              onClick={() => onCategoryChange(category.slug)}
            >
              {category.name}
            </div>
          ))}
        </div>
        
        {/* Right scroll button */}
        <button 
          onClick={scrollRight}
          className="flex-shrink-0 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center transition-all shadow-lg backdrop-blur-sm ml-2"
          aria-label="Scroll right"
        >
          <ChevronRight className="text-white" size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
