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
  return (
    <section className="mb-8">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 pb-2">
          {categories.map(category => (
            <Button
              key={category.id}
              variant="ghost"
              className={`category-item flex-shrink-0 py-2 px-4 rounded-full ${
                activeCategory === category.slug ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
              onClick={() => onCategoryChange(category.slug)}
            >
              <span className="mr-1" dangerouslySetInnerHTML={{ __html: category.icon }} />
              {category.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
