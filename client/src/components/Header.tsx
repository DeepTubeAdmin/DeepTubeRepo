import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, User, Package, History, LogOut, Upload, WandSparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import UploadMediaModal from "./UploadMediaModal";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search functionality will be implemented later
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleUploadClick = () => {
    console.log("Upload button clicked with isOpen:", uploadModalOpen);
    
    if (!user) {
      console.log("User not authenticated, redirecting to auth page");
      toast({
        title: "Authentication required",
        description: "You need to sign in to upload media",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }
    
    console.log("Setting upload modal to open");
    setUploadModalOpen(true);
    console.log("Upload modal state after setting:", !uploadModalOpen ? "open" : "closed");
  };

  return (
    <header className="bg-secondary sticky top-0 z-50 shadow-md">
      <div className="bg-primary/5 border-b border-primary/20">
        <div className="container mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-2 md:mb-0">
            <Video className="h-5 w-5 text-primary mr-2" />
            <div>
              <h3 className="font-medium text-sm text-primary">Create AI Videos with Synthesia</h3>
            </div>
          </div>
          <Button 
            size="sm"
            className="bg-primary hover:bg-primary/90 text-xs px-3 py-1 h-auto"
            onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
          >
            <WandSparkles className="mr-1 h-3 w-3" />
            Try Synthesia
          </Button>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-primary font-bold text-2xl">
              Deep-Tube
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
            {/* Upload Button */}
            <Button 
              variant="outline"
              className="rounded-full px-4 py-1 font-medium hidden sm:flex items-center"
              onClick={handleUploadClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Media
            </Button>
            
            {/* Create Button */}
            <Button 
              variant="outline"
              className="rounded-full px-4 py-1 font-medium hidden sm:flex items-center"
              onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
            >
              <WandSparkles className="mr-2 h-4 w-4" />
              Create
            </Button>
            
            {/* Mobile Upload Button */}
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden"
              onClick={handleUploadClick}
            >
              <Upload className="h-4 w-4" />
            </Button>
            
            {/* Mobile Create Button */}
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden"
              onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
            >
              <WandSparkles className="h-4 w-4" />
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
                  <span>My Videos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <History className="mr-2 h-4 w-4" />
                  <span>History</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleLogout}>
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
      
      {/* Upload Media Modal */}
      <UploadMediaModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
      />
    </header>
  );
}