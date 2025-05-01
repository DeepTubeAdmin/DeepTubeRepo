import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { useLocation } from "wouter";
import { FaFacebook, FaGoogle, FaApple } from "react-icons/fa";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  const [_, setLocation] = useLocation();

  const handleLoginClick = () => {
    onClose();
    setLocation("/auth");
  };

  const handleSocialLogin = (provider: string) => {
    // Close the modal and redirect to auth page
    onClose();
    // Delay the redirect slightly to allow modal close animation
    setTimeout(() => {
      setLocation("/auth");
    }, 100);
  };

  return (
    <SimpleDialog 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Login Required"
    >
      <div className="space-y-5">
        <p className="text-center text-muted-foreground mb-2">
          You need to be logged in to upload media to DeepTube.co
        </p>
        
        <div className="flex flex-col space-y-3">
          <Button 
            onClick={() => handleSocialLogin("facebook")}
            className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
          >
            <FaFacebook className="mr-2 h-4 w-4" />
            Continue with Facebook
          </Button>
          
          <Button 
            onClick={() => handleSocialLogin("google")}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-black"
          >
            <FaGoogle className="mr-2 h-4 w-4 text-[#4285F4]" />
            Continue with Google
          </Button>
          
          <Button 
            onClick={() => handleSocialLogin("apple")}
            className="bg-black hover:bg-black/90 text-white"
          >
            <FaApple className="mr-2 h-4 w-4" />
            Continue with Apple
          </Button>
        </div>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-muted"></div>
          <span className="flex-shrink mx-4 text-muted-foreground text-sm">or</span>
          <div className="flex-grow border-t border-muted"></div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button onClick={handleLoginClick} className="bg-primary hover:bg-primary/90">
            Login with Email/Username
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleLoginClick}
            className="border-primary text-primary hover:bg-primary/10"
          >
            Create an Account
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground pt-2">
          By continuing, you agree to DeepTube.co's Terms of Service and Privacy Policy.
        </p>
      </div>
    </SimpleDialog>
  );
}