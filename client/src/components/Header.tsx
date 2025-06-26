import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Search,
  User,
  Package,
  History,
  LogOut,
  Upload,
  WandSparkles,
  Video,
  MessageSquare,
  Shuffle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useShuffle } from "@/App";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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

  console.log("user", user);

  // Fetch unread message count
  const { data: unreadMessageData } = useQuery({
    queryKey: ["/api/messages/unread/count"],
    queryFn: async () => {
      if (!user) return { count: 0 };
      const response = await apiRequest("GET", "/api/messages/unread/count");
      if (!response.ok) {
        console.error("Failed to fetch unread message count");
        return { count: 0 };
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  // Fetch admin notification count for pending and reported content
  const { data: adminNotificationData } = useQuery({
    queryKey: ["/api/admin/notifications/count"],
    queryFn: async () => {
      if (!user || (!user.isAdmin && user.id !== 1 && user.id !== 2)) {
        return { pendingCount: 0, reportedCount: 0, totalCount: 0 };
      }

      try {
        // Fetch pending content count
        const pendingResponse = await apiRequest(
          "GET",
          "/api/admin/content/pending"
        );
        const pendingData = pendingResponse.ok
          ? await pendingResponse.json()
          : [];

        // Fetch reported content count
        const reportedResponse = await apiRequest(
          "GET",
          "/api/admin/content/reported"
        );
        const reportedData = reportedResponse.ok
          ? await reportedResponse.json()
          : [];

        const pendingCount = Array.isArray(pendingData)
          ? pendingData.length
          : 0;
        const reportedCount = Array.isArray(reportedData)
          ? reportedData.length
          : 0;

        return {
          pendingCount,
          reportedCount,
          totalCount: pendingCount + reportedCount,
        };
      } catch (error) {
        console.error("Failed to fetch admin notification count:", error);
        return { pendingCount: 0, reportedCount: 0, totalCount: 0 };
      }
    },
    enabled: !!user && (user.isAdmin || user.id === 1 || user.id === 2),
    refetchInterval: 30000, // Refetch every 30 seconds for admin notifications
  });

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

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // We'll do minimal preprocessing on the client side
      // Just trim whitespace and replace multiple spaces with single space
      const processedQuery = searchQuery.trim().replace(/\s+/g, " ");

      if (processedQuery) {
        const searchPath = `/search?q=${encodeURIComponent(processedQuery)}`;
        console.log("Header search - redirecting to:", searchPath);

        // Force a full page navigation instead of using setLocation
        window.location.href = searchPath;

        // The line below won't run due to page navigation
        setSearchQuery("");
      } else {
        console.log("Search query was empty after processing:", searchQuery);
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

    console.log("Triggering content shuffle with seed:", shuffleId);

    // Force reload the page with the random shuffle parameter
    // No delay needed since we removed the toast
    window.location.href = `/?shuffleSeed=${shuffleId}`;
  };

  if (simple) {
    return (
      <header className="bg-black py-2 px-2 sm:px-4 sticky top-0 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo with tagline */}
            <div className="flex items-center">
              <div
                className="flex items-center cursor-pointer group"
                onClick={handleLogoClick}
              >
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Logo */}
                  <div className="flex items-baseline relative">
                    <span
                      className="font-bold text-lg sm:text-2xl tracking-tight"
                      style={{
                        background:
                          "linear-gradient(135deg, #FF7D33 0%, #4C6EF5 50%, #B86BFF 100%)",
                        backgroundSize: "300% 300%",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        animation: "gradientShift 8s ease infinite",
                      }}
                    >
                      DeepTube
                    </span>
                    <span
                      className="font-medium text-xs absolute top-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #FF7D33 0%, #4C6EF5 50%, #B86BFF 100%)",
                        backgroundSize: "300% 300%",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        animation: "gradientShift 8s ease infinite",
                        left: "100%",
                      }}
                    >
                      AI
                    </span>
                  </div>

                  {/* Separator Line */}
                  <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-400 to-transparent opacity-50 -ml-1 hidden sm:block" />

                  {/* Tagline */}
                  <span className="font-light text-xs sm:text-sm tracking-wide text-gray-400 -ml-3 hidden md:inline">
                    Imagination Made Digital
                  </span>
                </div>
                <Shuffle className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Custom CSS Animations */}
                <style>{`
                  @keyframes gradientShift {
                    0%,
                    100% {
                      background-position: 0% 50%;
                    }
                    50% {
                      background-position: 100% 50%;
                    }
                  }
                `}</style>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Create Button */}
              <Button
                className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-medium w-7 h-7 sm:py-1 sm:px-3 sm:w-auto sm:h-auto rounded-full flex items-center justify-center hover:opacity-90 transition-all"
                onClick={() => setIsAIGeneratorsModalOpen(true)}
              >
                <WandSparkles className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
              </Button>

              {/* User Account */}
              <div
                className="relative"
                id="userAccountContainer"
                ref={userBtnRef}
              >
                <div
                  className="h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white cursor-pointer text-xs sm:text-sm"
                  onClick={toggleUserDropdown}
                >
                  <span>
                    {user?.username
                      ? user.username.charAt(0).toUpperCase()
                      : "A"}
                  </span>
                  {user &&
                    (unreadMessageData?.count > 0 ||
                      ((adminNotificationData?.totalCount || 0) > 0 &&
                        (user.isAdmin || user.id === 1 || user.id === 2))) && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 bg-orange-500 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-bold border border-black">
                        {(() => {
                          const messageCount = unreadMessageData?.count || 0;
                          const adminCount =
                            user.isAdmin || user.id === 1 || user.id === 2
                              ? adminNotificationData?.totalCount || 0
                              : 0;
                          const totalCount = messageCount + adminCount;
                          return totalCount > 9 ? "9+" : totalCount;
                        })()}
                      </div>
                    )}
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
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer relative"
                        >
                          My Messages
                          {unreadMessageData?.count > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center h-5 w-5 text-xs bg-orange-600 text-white rounded-full">
                              {unreadMessageData.count > 9
                                ? "9+"
                                : unreadMessageData.count}
                            </span>
                          )}
                        </a>
                        {user &&
                          (user.isAdmin || user.id === 1 || user.id === 2) && (
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
            <div
              className="flex items-center cursor-pointer group"
              onClick={handleLogoClick}
            >
              <div className="flex items-center gap-2 sm:gap-6">
                {/* Logo */}
                <div className="flex items-baseline relative">
                  <span
                    className="font-bold text-lg sm:text-2xl tracking-tight"
                    style={{
                      background:
                        "linear-gradient(135deg, #FF7D33 0%, #4C6EF5 50%, #B86BFF 100%)",
                      backgroundSize: "300% 300%",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      animation: "gradientShift 8s ease infinite",
                    }}
                  >
                    DeepTube
                  </span>
                  <span
                    className="font-medium text-xs absolute top-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #FF7D33 0%, #4C6EF5 50%, #B86BFF 100%)",
                      backgroundSize: "300% 300%",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      animation: "gradientShift 8s ease infinite",
                      left: "100%",
                    }}
                  >
                    AI
                  </span>
                </div>

                {/* Separator Line - Hidden on very small screens */}
                <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-400 to-transparent opacity-50 -ml-1 hidden xs:block" />

                {/* Tagline */}
                <span className="font-light text-xs sm:text-sm tracking-wide text-gray-400 -ml-3 hidden sm:inline">
                  Imagination Made Digital
                </span>
              </div>
              <Shuffle className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Custom CSS Animations */}
              <style>{`
                @keyframes gradientShift {
                  0%,
                  100% {
                    background-position: 0% 50%;
                  }
                  50% {
                    background-position: 100% 50%;
                  }
                }
              `}</style>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 mx-4 lg:mx-8">
            <div className="w-full max-w-2xl relative">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search AI-generated content..."
                  className="w-full py-2 px-4 rounded-full bg-[#121212] border border-[#303030] text-white focus:border-[#1976D2] focus:outline-none text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 h-full px-4 text-gray-400"
                >
                  <Search size={18} />
                </button>
              </form>
            </div>
          </div>

          {/* User Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
            {/* Upload Button */}
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium w-7 h-7 sm:w-auto sm:h-10 sm:py-1 sm:px-4 rounded-full flex items-center justify-center sm:justify-start hover:opacity-90 hover:transform hover:translate-y-[-2px] transition-all"
              onClick={handleUploadClick}
            >
              <Upload className="h-2.5 w-2.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </Button>

            {/* Forum Button */}
            <Link href="/forum">
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium w-7 h-7 sm:w-auto sm:h-10 sm:py-1 sm:px-4 rounded-full flex items-center justify-center sm:justify-start hover:opacity-90 hover:transform hover:translate-y-[-2px] transition-all">
                <MessageSquare className="h-2.5 w-2.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Forum</span>
              </Button>
            </Link>

            {/* Create Button */}
            <Button
              className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-medium w-7 h-7 sm:w-auto sm:h-10 sm:py-1 sm:px-4 rounded-full flex items-center justify-center sm:justify-start hover:opacity-90 hover:transform hover:translate-y-[-2px] transition-all"
              onClick={() => setIsAIGeneratorsModalOpen(true)}
            >
              <WandSparkles className="h-2.5 w-2.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create</span>
            </Button>

            {/* User Account */}
            <div
              className="relative"
              id="userAccountContainer"
              ref={userBtnRef}
            >
              <div
                className="h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white cursor-pointer text-xs sm:text-sm"
                onClick={toggleUserDropdown}
              >
                <span>
                  {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
                </span>
                {user &&
                  (unreadMessageData?.count > 0 ||
                    ((adminNotificationData?.totalCount || 0) > 0 &&
                      (user.isAdmin || user.id === 1 || user.id === 2))) && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 bg-orange-500 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-bold border border-black">
                      {(() => {
                        const messageCount = unreadMessageData?.count || 0;
                        const adminCount =
                          user.isAdmin || user.id === 1 || user.id === 2
                            ? adminNotificationData?.totalCount || 0
                            : 0;
                        const totalCount = messageCount + adminCount;
                        return totalCount > 9 ? "9+" : totalCount;
                      })()}
                    </div>
                  )}
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
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer relative"
                      >
                        My Messages
                        {unreadMessageData?.count > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center h-5 w-5 text-xs bg-orange-600 text-white rounded-full">
                            {unreadMessageData.count > 9
                              ? "9+"
                              : unreadMessageData.count}
                          </span>
                        )}
                      </a>
                      {/* Show Admin Dashboard link only for admin users */}
                      {user &&
                        (user.isAdmin || user.id === 1 || user.id === 2) && (
                          <a
                            onClick={() => {
                              setLocation("/admin");
                              setShowUserDropdown(false);
                            }}
                            className="block px-4 py-2 text-sm text-red-300 hover:bg-gray-800 cursor-pointer"
                          >
                            Admin Dashboard
                            {adminNotificationData &&
                              adminNotificationData.totalCount > 0 && (
                                <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                                  {adminNotificationData.totalCount}
                                </span>
                              )}
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
      <div className="md:hidden mt-2 px-2">
        <form onSubmit={handleSearch} className="relative w-full">
          <input
            type="text"
            placeholder="Search AI-generated content..."
            className="w-full py-2 px-4 rounded-full bg-[#121212] border border-[#303030] text-white focus:border-[#1976D2] focus:outline-none text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="absolute right-0 top-0 h-full px-4 text-gray-400"
          >
            <Search size={16} />
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
