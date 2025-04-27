import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SimpleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function SimpleDialog({ isOpen, onClose, children, title }: SimpleDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Dialog content */}
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 z-50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}