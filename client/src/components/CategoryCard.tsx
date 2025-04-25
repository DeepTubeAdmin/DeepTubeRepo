import { PopularCategory } from "@/types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Link } from "wouter";

interface CategoryCardProps {
  category: PopularCategory;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/category/${category.id}`}>
      <a className="relative rounded-lg overflow-hidden group">
        <AspectRatio ratio={16/9}>
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover"
          />
        </AspectRatio>
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
        <div className="absolute bottom-0 left-0 p-3">
          <h3 className="text-white font-bold text-lg">{category.name}</h3>
          <p className="text-muted-foreground text-sm">{category.count} videos</p>
        </div>
        <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-20 transition-opacity"></div>
      </a>
    </Link>
  );
}
