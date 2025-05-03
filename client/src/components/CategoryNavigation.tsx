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
    <div className="bg-black sticky top-14 z-40 shadow-md">
      <div className="container mx-auto relative">
        {/* Left scroll button */}
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-gradient-to-r from-black to-transparent h-full px-2 flex items-center"
          aria-label="Scroll left"
        >
          <span className="text-white text-xl">◀</span>
        </button>
        
        {/* Right scroll button */}
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-gradient-to-l from-black to-transparent h-full px-2 flex items-center"
          aria-label="Scroll right"
        >
          <span className="text-white text-xl">▶</span>
        </button>
        
        {/* Scrollable tabs */}
        <div className="nav-tabs px-10 overflow-x-auto">
          {/* All Categories option */}
          <div 
            className={`nav-tab cursor-pointer text-center ${!activeCategory ? 'active' : ''}`}
            onClick={() => onCategoryChange('')}
          >
            All
          </div>
          
          {/* Category options */}
          {categories.map(category => (
            <div 
              key={category.slug}
              className={`nav-tab cursor-pointer text-center ${activeCategory === category.slug ? 'active' : ''}`}
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
