import { useState, useEffect } from "react";
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
import ProfilePage from "@/pages/profile-page";
import SearchResults from "@/pages/search-results";
import AdminPage from "@/pages/admin-page";
import AccessDenied from "@/pages/access-denied";
import { AuthProvider } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import AgeVerificationModal from "@/components/AgeVerificationModal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/media/:id" component={MediaDetail} />
      <Route path="/search" component={SearchResults} />
      <Route path="/forum" component={ForumPage} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/my-videos" component={MyVideosPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/access-denied" component={AccessDenied} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;