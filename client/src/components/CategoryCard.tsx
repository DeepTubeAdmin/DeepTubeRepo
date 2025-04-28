import { PopularCategory } from "@/types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Link } from "wouter";

interface CategoryCardProps {
  category: PopularCategory;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/category/${category.id}`} className="relative rounded-md overflow-hidden group block h-full shadow-sm hover:shadow-md transition-all">
      <AspectRatio ratio={3/4}>
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
        />
      </AspectRatio>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-2">
        <h3 className="text-white font-medium text-base">{category.name}</h3>
        <p className="text-gray-300 text-xs">{category.count} videos</p>
      </div>
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </Link>
  );
}
