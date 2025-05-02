import React from 'react';

interface AIWatermarkProps {
  aiGenerator?: string;
  generator?: string; // For backward compatibility
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'small' | 'medium' | 'large';
}

export default function AIWatermark({ 
  aiGenerator,
  generator,
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
    'small': 'text-base',
    'medium': 'text-xl',
    'large': 'text-2xl',
  };

  // Use aiGenerator if provided, fall back to generator prop or just show 'AI'
  const generatorName = aiGenerator || generator || 'AI';
  
  return (
    <div 
      className={`absolute ${positionClasses[position]} ${sizeClasses[size]} text-primary font-extrabold z-50 pointer-events-none`}
      style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}
    >
      {generatorName}
    </div>
  );
}