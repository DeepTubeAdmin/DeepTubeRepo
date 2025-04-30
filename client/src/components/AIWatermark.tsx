import React from 'react';

interface AIWatermarkProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'small' | 'medium' | 'large';
}

export default function AIWatermark({ 
  position = 'bottom-right', 
  size = 'medium' 
}: AIWatermarkProps) {
  // Define position classes
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  };

  // Define size classes
  const sizeClasses = {
    'small': 'text-sm px-1.5 py-0.5',
    'medium': 'text-base px-2 py-1',
    'large': 'text-lg px-3 py-1.5',
  };

  return (
    <div 
      className={`absolute ${positionClasses[position]} ${sizeClasses[size]} bg-primary bg-opacity-90 text-black font-bold rounded-md z-50 shadow-lg pointer-events-none`}
    >
      AI
    </div>
  );
}