import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface AgeVerificationModalProps {
  isOpen: boolean;
  onVerify: () => void;
}

export default function AgeVerificationModal({ isOpen, onVerify }: AgeVerificationModalProps) {
  const [_, setLocation] = useLocation();
  
  const handleConfirmAge = () => {
    // Set a cookie or localStorage to remember the user's choice
    localStorage.setItem('ageVerified', 'true');
    onVerify();
  };
  
  const handleRejectAge = () => {
    // Redirect to the access denied page
    setLocation('/access-denied');
  };
  
  return (
    <Dialog open={isOpen}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-amber-500" />
            Age Verification Required
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-center">
            This website contains AI-generated content that requires users to be 18 years or older.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-center mb-6 text-white">
            Are you at least 18 years of age?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleConfirmAge}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 min-w-[120px] justify-center"
            >
              <CheckCircle className="h-4 w-4" />
              Yes, I am 18+
            </Button>
            
            <Button 
              onClick={handleRejectAge}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white min-w-[120px]"
            >
              No, I am not 18+
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-gray-400 text-center mt-2">
          By clicking "Yes," you confirm that you are at least 18 years old and accept our Terms of Service and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}