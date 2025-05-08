import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, User, Package, History, LogOut, Upload, WandSparkles, Video, MessageSquare, Shuffle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useShuffle } from "@/App";
import UploadMediaModal from "./UploadMediaModal";
import LoginRequiredModal from "./LoginRequiredModal";
import AIGeneratorsModal from "./AIGeneratorsModal";

interface HeaderProps {
  simple?: boolean;
}

export default function Header({ simple = false }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAIGeneratorsModalOpen, setIsAIGeneratorsModalOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userDropdownRef.current && 
        userBtnRef.current && 
        !userDropdownRef.current.contains(event.target as Node) &&
        !userBtnRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // We'll do minimal preprocessing on the client side
      // Just trim whitespace and replace multiple spaces with single space
      const processedQuery = searchQuery.trim().replace(/\s+/g, ' ');
      
      if (processedQuery) {
        const searchPath = `/search?q=${encodeURIComponent(processedQuery)}`;
        console.log('Header search - redirecting to:', searchPath);
        
        // Force a full page navigation instead of using setLocation
        window.location.href = searchPath;
        
        // The line below won't run due to page navigation
        setSearchQuery(''); 
      } else {
        console.log('Search query was empty after processing:', searchQuery);
      }
    }
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
    setShowUserDropdown(false);
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

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  // Get the triggerShuffle function from the ShuffleContext
  const { triggerShuffle } = useShuffle();
  
  // Handle logo click to trigger content shuffling with direct page reload
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Generate a more complex shuffle ID that includes timestamp for uniqueness
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const shuffleId = `${timestamp.toString(36)}-${random}`;
    
    // Toast notification removed as requested
    
    console.log('Triggering content shuffle with seed:', shuffleId);
    
    // Force reload the page with the random shuffle parameter
    // No delay needed since we removed the toast
    window.location.href = `/?shuffleSeed=${shuffleId}`;
  };

  if (simple) {
    return (
      <header className="bg-black py-2 px-4 sticky top-0 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo with tagline */}
            <div className="flex items-center">
              <div className="flex items-center cursor-pointer group" onClick={handleLogoClick}>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 group-hover:from-purple-500 group-hover:to-blue-600 transition-all duration-300">
                    DeepTube<span className="text-gray-400 text-sm align-top">Beta</span>
                  </h1>
                  <span className="text-xs text-gray-400 -mt-1">Ethical AI Media</span>
                </div>
                <Shuffle className="ml-2 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Create Button */}
              <Button
                className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-medium py-1 px-3 rounded-full flex items-center hover:opacity-90 transition-all"
                onClick={() => setIsAIGeneratorsModalOpen(true)}
              >
                <WandSparkles className="h-4 w-4" />
              </Button>
              
              {/* User Account */}
              <div className="relative" id="userAccountContainer" ref={userBtnRef}>
                <div 
                  className="h-8 w-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white cursor-pointer"
                  onClick={toggleUserDropdown}
                >
                  <span>{user ? user.username.charAt(0).toUpperCase() : "A"}</span>
                </div>
                
                {showUserDropdown && (
                  <div 
                    ref={userDropdownRef}
                    className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg py-1"
                  >
                    {!user ? (
                      <>
                        <a 
                          onClick={() => setLocation("/auth")} 
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                        >
                          Login
                        </a>
                        <a 
                          onClick={() => setLocation("/auth")} 
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                        >
                          Register
                        </a>
                      </>
                    ) : (
                      <>
                        <a 
                          onClick={() => {
                            setLocation("/profile");
                            setShowUserDropdown(false);
                          }}
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                        >
                          Profile
                        </a>
                        <a 
                          onClick={() => {
                            setLocation("/my-videos");
                            setShowUserDropdown(false);
                          }} 
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                        >
                          My Videos
                        </a>
                        <a 
                          onClick={() => {
                            setLocation("/my-messages");
                            setShowUserDropdown(false);
                          }} 
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                        >
                          My Messages
                        </a>
                        {user && (user.id === 1 || user.id === 2) && (
                          <a 
                            onClick={() => {
                              setLocation("/admin");
                              setShowUserDropdown(false);
                            }} 
                            className="block px-4 py-2 text-sm text-red-300 hover:bg-gray-800 cursor-pointer"
                          >
                            Admin Dashboard
                          </a>
                        )}
                        <a 
                          onClick={handleLogout} 
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                        >
                          Logout
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Login Required Modal */}
        <LoginRequiredModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
        
        {/* AI Generators Modal */}
        <AIGeneratorsModal
          isOpen={isAIGeneratorsModalOpen}
          onClose={() => setIsAIGeneratorsModalOpen(false)}
        />
      </header>
    );
  }
  
  return (
    <header className="bg-black py-2 px-4 sticky top-0 z-50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo with tagline */}
          <div className="flex items-center">
            <div className="flex items-center cursor-pointer group" onClick={handleLogoClick}>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 group-hover:from-purple-500 group-hover:to-blue-600 transition-all duration-300">
                  DeepTube<span className="text-gray-400 text-sm align-top">Beta</span>
                </h1>
                <span className="text-xs text-gray-400 -mt-1">Ethical AI Media</span>
              </div>
              <Shuffle className="ml-2 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="hidden md:flex flex-1 mx-8">
            <div className="w-full max-w-2xl relative">
              <form onSubmit={handleSearch}>
                <input 
                  type="text" 
                  placeholder="Search AI-generated content..." 
                  className="w-full py-2 px-4 rounded-full bg-[#121212] border border-[#303030] text-white focus:border-[#1976D2] focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute right-0 top-0 h-full px-4 text-gray-400">
                  <Search size={18} />
                </button>
              </form>
            </div>
          </div>
          
          {/* User Controls */}
          <div className="flex items-center space-x-4">
            {/* Upload Button */}
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium py-1 px-4 rounded-full flex items-center hover:opacity-90 hover:transform hover:translate-y-[-2px] transition-all"
              onClick={handleUploadClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
            
            {/* Forum Button */}
            <Link href="/forum">
              <Button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium py-1 px-4 rounded-full flex items-center hover:opacity-90 hover:transform hover:translate-y-[-2px] transition-all"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Forum</span>
              </Button>
            </Link>
            
            {/* Create Button */}
            <Button
              className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-medium py-1 px-4 rounded-full flex items-center hover:opacity-90 hover:transform hover:translate-y-[-2px] transition-all"
              onClick={() => setIsAIGeneratorsModalOpen(true)}
            >
              <WandSparkles className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
            
            {/* User Account */}
            <div className="relative" id="userAccountContainer" ref={userBtnRef}>
              <div 
                className="h-8 w-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white cursor-pointer"
                onClick={toggleUserDropdown}
              >
                <span>{user ? user.username.charAt(0).toUpperCase() : "A"}</span>
              </div>
              
              {showUserDropdown && (
                <div 
                  ref={userDropdownRef}
                  className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg py-1"
                >
                  {!user ? (
                    <>
                      <a 
                        onClick={() => setLocation("/auth")} 
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                      >
                        Login
                      </a>
                      <a 
                        onClick={() => setLocation("/auth")} 
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                      >
                        Register
                      </a>
                    </>
                  ) : (
                    <>
                      <a 
                        onClick={() => {
                          setLocation("/profile");
                          setShowUserDropdown(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                      >
                        Profile
                      </a>
                      <a 
                        onClick={() => {
                          setLocation("/my-videos");
                          setShowUserDropdown(false);
                        }} 
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                      >
                        My Videos
                      </a>
                      <a 
                        onClick={() => {
                          setLocation("/my-messages");
                          setShowUserDropdown(false);
                        }} 
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                      >
                        My Messages
                      </a>
                      {/* Show Admin Dashboard link only for admin users */}
                      {user && (user.id === 1 || user.id === 2) && (
                        <a 
                          onClick={() => {
                            setLocation("/admin");
                            setShowUserDropdown(false);
                          }} 
                          className="block px-4 py-2 text-sm text-red-300 hover:bg-gray-800 cursor-pointer"
                        >
                          Admin Dashboard
                        </a>
                      )}
                      <a 
                        onClick={handleLogout} 
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                      >
                        Logout
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Search Bar - Only on mobile */}
      <div className="md:hidden mt-2">
        <form onSubmit={handleSearch} className="relative w-full">
          <input 
            type="text" 
            placeholder="Search AI-generated content..." 
            className="w-full py-2 px-4 rounded-full bg-[#121212] border border-[#303030] text-white focus:border-[#1976D2] focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="absolute right-0 top-0 h-full px-4 text-gray-400">
            <Search size={18} />
          </button>
        </form>
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
      
      {/* AI Generators Modal */}
      <AIGeneratorsModal
        isOpen={isAIGeneratorsModalOpen}
        onClose={() => setIsAIGeneratorsModalOpen(false)}
      />
    </header>
  );
}