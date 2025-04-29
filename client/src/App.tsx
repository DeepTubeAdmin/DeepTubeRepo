import { Switch, Route } from "wouter";
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
import { AuthProvider } from "@/hooks/use-auth";
import Layout from "@/components/Layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/media/:id" component={MediaDetail} />
      <Route path="/forum" component={ForumPage} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="bg-background">
            <Toaster />
            <Layout showHeader={false}>
              <Router />
            </Layout>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;