import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface FullscreenImageModalProps {
  imageUrl: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FullscreenImageModal({
  imageUrl,
  alt,
  isOpen,
  onClose
}: FullscreenImageModalProps) {
  // Close modal on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center" 
      onClick={onClose}
    >
      <img 
        src={imageUrl} 
        alt={alt}
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
      />
      
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:text-orange-500 bg-black/50 rounded-full transition-colors"
        title="Close"
      >
        <X size={24} />
      </button>
    </div>
  );
}