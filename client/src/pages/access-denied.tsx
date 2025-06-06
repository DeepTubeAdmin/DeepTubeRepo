import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-red-900/30 text-red-500">
            <Info size={36} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        
        <p className="text-gray-300 mb-6">
          We're sorry, but you must be at least 18 years old to access this website.
        </p>
        
        <p className="text-gray-400 text-sm mb-6">
          Even ethical AI content requires viewers be 18+.
          DeepTubeAI.com contains AI-generated content intended for adult audiences.
          If you are under 18, please exit this site now.
        </p>
        
        <div className="flex justify-center">
          <Button 
            className="bg-gray-800 hover:bg-gray-700 text-white"
            onClick={() => window.location.href = "https://www.google.com"}
          >
            Exit Site
          </Button>
        </div>
        
        <div className="mt-8 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            &copy; 2025 DeepTubeAI.com - Ethical AI Media
          </p>
        </div>
      </div>
    </div>
  );
}