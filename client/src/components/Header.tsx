import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, User, Package, History, LogOut, Upload, WandSparkles, Video, MessageSquare } from "lucide-react";
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
import LoginRequiredModal from "./LoginRequiredModal";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search functionality will be implemented later
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleUploadClick = () => {
    if (!user) {
      // Show login required modal instead of redirect
      setIsLoginModalOpen(true);
      return;
    }
    
    // If user is authenticated, open upload modal
    setUploadModalOpen(true);
  };

  return (
    <header className="bg-black sticky top-0 z-50 shadow-md">
      {/* Top Black Bar (Pornhub Style) */}
      <div className="bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between">
          {/* Logo and Center Content */}
          <div className="flex items-center justify-between w-full">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="font-bold text-2xl">
                <span className="text-white">Deep</span>
                <span className="text-primary">Tube</span>
                <span className="text-xs align-top text-white">.co</span>
              </h1>
            </Link>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <form onSubmit={handleSearch} className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search for AI-generated media..."
                  className="w-full py-2 px-4 bg-muted text-foreground rounded-sm focus:outline-none focus:ring-1 focus:ring-primary border-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-0 top-0 h-full bg-primary hover:bg-primary/90 text-black rounded-r-sm rounded-l-none"
                >
                  <Search size={18} />
                </Button>
              </form>
            </div>

            {/* User Controls */}
            <div className="flex items-center space-x-3">
              {/* Upload Button */}
              <Button 
                className="bg-primary hover:bg-primary/90 text-black font-bold hidden sm:flex items-center rounded-sm"
                onClick={handleUploadClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              
              {/* Create Button */}
              <Button 
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800 hover:text-white hidden sm:flex items-center rounded-sm"
                onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
              >
                <WandSparkles className="mr-2 h-4 w-4" />
                Create
              </Button>
              
              {/* Forum Button */}
              <Link href="/forum">
                <Button 
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-800 hover:text-white hidden sm:flex items-center rounded-sm"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Forum
                </Button>
              </Link>
              
              {/* Mobile Buttons */}
              <div className="sm:hidden flex space-x-2">
                <Button
                  className="bg-primary hover:bg-primary/90 text-black p-2 h-9 w-9 rounded-sm"
                  onClick={handleUploadClick}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-800 p-2 h-9 w-9 rounded-sm"
                  onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
                >
                  <WandSparkles className="h-4 w-4" />
                </Button>
              </div>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="relative border-gray-700 hover:bg-gray-800 p-0 h-9 w-9 rounded-sm">
                    <Avatar className="w-full h-full bg-gray-800 rounded-none">
                      <AvatarFallback className="text-primary font-bold rounded-none">A</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-black border border-gray-800 rounded-none">
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-800">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-800" onClick={() => setLocation("/my-videos")}>
                    <Package className="mr-2 h-4 w-4" />
                    <span>My Videos</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-800">
                    <History className="mr-2 h-4 w-4" />
                    <span>History</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-800" />
                  <DropdownMenuItem className="cursor-pointer text-destructive hover:bg-gray-800" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* Promotion Bar */}
        <div className="bg-gray-900 py-2">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center">
              <Video className="h-5 w-5 text-primary mr-2" />
              <span className="text-sm text-white">Create AI Videos with Synthesia</span>
            </div>
            <Button 
              size="sm"
              className="bg-primary hover:bg-primary/90 text-black text-xs px-3 py-1 h-auto rounded-sm"
              onClick={() => window.open('https://www.synthesia.io/?via=seth-glass', '_blank')}
            >
              <WandSparkles className="mr-1 h-3 w-3" />
              Try Synthesia
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden p-3 bg-black">
          <form onSubmit={handleSearch} className="relative w-full">
            <Input
              type="text"
              placeholder="Search for AI-generated media..."
              className="w-full py-2 px-4 bg-muted text-foreground rounded-sm focus:outline-none focus:ring-1 focus:ring-primary border-none"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-0 top-0 h-full bg-primary hover:bg-primary/90 text-black rounded-r-sm rounded-l-none"
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
      
      {/* Login Required Modal */}
      <LoginRequiredModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </header>
  );
}