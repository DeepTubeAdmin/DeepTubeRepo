import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  // Reset zoom and rotation when modal closes
  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen]);
  
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
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div 
        className="relative max-w-screen max-h-screen p-4 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on modal content
      >
        <img 
          src={imageUrl} 
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{ 
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        />
        
        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/70 rounded-full p-2">
          <button 
            onClick={handleZoomIn} 
            className="p-2 text-white hover:text-orange-500 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button 
            onClick={handleZoomOut} 
            className="p-2 text-white hover:text-orange-500 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <button 
            onClick={handleRotate} 
            className="p-2 text-white hover:text-orange-500 transition-colors"
            title="Rotate"
          >
            <RotateCw size={20} />
          </button>
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white hover:text-orange-500 bg-black/50 rounded-full transition-colors"
          title="Close"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
}