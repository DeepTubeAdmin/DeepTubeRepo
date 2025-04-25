import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, User, Package, History, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/lib/utils";
import CreditPurchaseModal from "./CreditPurchaseModal";

interface HeaderProps {
  credits: number;
  onCreditPurchase: (amount: number) => void;
}

export default function Header({ credits, onCreditPurchase }: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search functionality will be implemented later
  };

  return (
    <>
      <header className="bg-secondary sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <a className="text-primary font-bold text-2xl">AIVideoHub</a>
              </Link>
            </div>

            {/* Search Bar (Hidden on mobile) */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <form onSubmit={handleSearch} className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search for AI videos..."
                  className="w-full py-2 px-4 bg-muted text-foreground rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  <Search size={18} />
                </Button>
              </form>
            </div>

            {/* User Controls */}
            <div className="flex items-center space-x-4">
              {/* Credits Display */}
              <div className="hidden sm:flex items-center bg-muted px-3 py-1 rounded-full cursor-pointer hover:bg-accent">
                <span className="text-primary font-bold mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="7" />
                    <circle cx="16" cy="16" r="7" />
                    <line x1="12" y1="12" x2="12" y2="12" />
                  </svg>
                </span>
                <span className="font-medium">{formatNumber(credits)}</span>
                <span className="text-muted-foreground text-sm ml-1">credits</span>
              </div>

              {/* Buy Credits Button */}
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="credit-button rounded-full px-4 py-1 font-bold flex items-center"
              >
                <PlusCircle size={16} className="mr-1" /> Buy Credits
              </Button>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative p-0" size="icon">
                    <Avatar className="w-9 h-9 bg-primary">
                      <AvatarFallback className="text-primary-foreground font-bold">A</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-muted">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    <span>Purchased Videos</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <History className="mr-2 h-4 w-4" />
                    <span>History</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="mt-3 md:hidden">
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                type="text"
                placeholder="Search for AI videos..."
                className="w-full py-2 px-4 bg-muted text-foreground rounded-full"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              >
                <Search size={18} />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <CreditPurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPurchase={onCreditPurchase}
      />
    </>
  );
}
