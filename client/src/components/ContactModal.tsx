import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Mail, Check, AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Email copied!",
      description: `${text} copied to clipboard`,
      variant: "default",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Contact Us
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Reach out to our team through the following email addresses
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-medium text-white mb-1">General Support</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-blue-400" />
                <span className="text-gray-300">support@deeptube.co</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white flex items-center gap-1"
                onClick={() => copyToClipboard('support@deeptube.co')}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              For general inquiries, account issues, or feedback
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-medium text-white mb-1">DMCA Requests</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-red-400" />
                <span className="text-gray-300">dmca@deeptube.co</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white flex items-center gap-1"
                onClick={() => copyToClipboard('dmca@deeptube.co')}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              For copyright concerns and content takedown requests
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}