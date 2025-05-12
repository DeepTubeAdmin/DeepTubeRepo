import { Category } from "@/types";

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
      <div className="container mx-auto relative">
        {/* Left scroll button */}
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-gradient-to-r from-[#0f0f0f] to-transparent h-full px-2 flex items-center"
          aria-label="Scroll left"
        >
          <span className="text-white text-xl">◀</span>
        </button>
        
        {/* Right scroll button */}
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-gradient-to-l from-[#0f0f0f] to-transparent h-full px-2 flex items-center"
          aria-label="Scroll right"
        >
          <span className="text-white text-xl">▶</span>
        </button>
        
        {/* Scrollable tabs */}
        <div className="nav-tabs px-10 overflow-x-auto flex items-center space-x-2 py-1">
          {/* All Categories option */}
          <div 
            className={`px-4 py-1.5 rounded-full cursor-pointer transition-all ${
              !activeCategory 
                ? 'bg-primary text-black font-medium' 
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
                  ? 'bg-primary text-black font-medium' 
                  : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#252525]'
              }`}
              onClick={() => onCategoryChange(category.slug)}
            >
              {category.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
