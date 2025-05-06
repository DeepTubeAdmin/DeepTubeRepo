import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import MediaDetail from "@/pages/media-detail";
import ForumPage from "@/pages/forum-page";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import MyVideosPage from "@/pages/my-videos";
import MyMessages from "@/pages/my-messages";
import ProfilePage from "@/pages/profile-page";
import UserPage from "@/pages/user-page";
import SearchResults from "@/pages/search-results";
import AdminPage from "@/pages/admin-page";
import AccessDenied from "@/pages/access-denied";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import { AuthProvider } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import AgeVerificationModal from "@/components/AgeVerificationModal";

// Create a context for shuffle functionality
export const ShuffleContext = createContext<{
  shuffleSeed: string;
  triggerShuffle: () => void;
}>({ 
  shuffleSeed: '',
  triggerShuffle: () => {} 
});

// Custom hook to use the shuffle context
export const useShuffle = () => useContext(ShuffleContext);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/media/:id" component={MediaDetail} />
      <Route path="/search" component={SearchResults} />
      <Route path="/forum" component={ForumPage} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/my-videos" component={MyVideosPage} />
      <Route path="/my-messages" component={MyMessages} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/user/:username" component={UserPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/access-denied" component={AccessDenied} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  
  // Create a state for the shuffle seed
  const [shuffleSeed, setShuffleSeed] = useState(() => {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  });
  
  // Function to trigger a new shuffle by generating a new seed with high entropy
  const triggerShuffle = () => {
    // Use multiple sources of randomness for better distribution
    const timestamp = new Date().getTime();
    const random1 = Math.random().toString(36).substring(2, 10);
    const random2 = Math.random().toString(36).substring(2, 10);
    const randomVal = Math.floor(Math.random() * 1000000).toString();
    const performanceNow = typeof performance !== 'undefined' ? 
      performance.now().toString(36).replace('.', '') : '';
    
    // Combine all sources for maximum entropy, add randomVal for even more entropy
    const newSeed = `${timestamp}-${random1}-${random2}-${randomVal}-${performanceNow}`;
    console.log('Triggering content shuffle with high-entropy seed:', newSeed);
    
    // First update the shuffle seed state (this will trigger re-renders in components)
    setShuffleSeed(newSeed);
    
    // Forcefully clear the entire query cache to ensure fresh data on all endpoints
    queryClient.clear();
    
    // For extra measure, also explicitly invalidate key content queries
    queryClient.invalidateQueries({ queryKey: ['/api/content/feed'] });
    queryClient.invalidateQueries({ queryKey: ['/api/videos'] });  
    queryClient.invalidateQueries({ queryKey: ['/api/content/trending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/content/popular'] });
    
    // Always force a full page reload when shuffling for guaranteed content refresh
    // The timeout ensures React state changes are processed first
    setTimeout(() => {
      // Create a forced reload URL with timestamp to guarantee cache bust
      const forcedReloadUrl = window.location.pathname === '/' ?
        `/?shuffle=${newSeed}&t=${Date.now()}` :
        `/?t=${Date.now()}`;
      
      // Use window.location.replace instead of href for a cleaner history
      window.location.replace(forcedReloadUrl);
    }, 200);
  };
  
  useEffect(() => {
    // Check if user has already verified their age
    const isVerified = localStorage.getItem('ageVerified') === 'true';
    
    // Skip age verification if on the access-denied page
    if (location === '/access-denied') {
      return;
    }
    
    // Show age verification if not already verified
    if (!isVerified) {
      setShowAgeVerification(true);
    }
  }, [location]);
  
  const handleAgeVerified = () => {
    setShowAgeVerification(false);
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ShuffleContext.Provider value={{ shuffleSeed, triggerShuffle }}>
          <TooltipProvider>
            <div className="bg-background">
              <Toaster />
              <AgeVerificationModal 
                isOpen={showAgeVerification}
                onVerify={handleAgeVerified}
              />
              <Router />
            </div>
          </TooltipProvider>
        </ShuffleContext.Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;