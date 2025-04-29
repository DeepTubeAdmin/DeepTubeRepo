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
  return (
    <div className="bg-black sticky top-14 z-40 shadow-md">
      <div className="container mx-auto">
        <div className="nav-tabs px-4">
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
