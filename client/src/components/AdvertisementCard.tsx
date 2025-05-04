import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AdvertisementCardProps {
  type: 'video' | 'image';
}

export default function AdvertisementCard({ type }: AdvertisementCardProps) {
  // Choose aspect ratio based on content type
  const aspectRatioClass = type === 'video' ? 'aspect-video' : 'aspect-[3/4]';
  
  // Mock ad colors
  const mockAdColors = [
    'bg-gradient-to-br from-orange-500 to-purple-600',
    'bg-gradient-to-r from-blue-500 to-indigo-600',
    'bg-gradient-to-br from-green-400 to-cyan-500',
    'bg-gradient-to-tr from-pink-500 to-orange-500',
  ];
  
  // Choose random background color
  const randomColor = mockAdColors[Math.floor(Math.random() * mockAdColors.length)];
  
  return (
    <div className={`${randomColor} rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
      <div className={`${aspectRatioClass} flex flex-col items-center justify-center text-white p-4 text-center`}>
        <div className="bg-black/20 rounded-full p-2 mb-2">
          <AlertCircle size={24} />
        </div>
        <h3 className="font-bold mb-2 text-lg">Advertisement</h3>
        <p className="text-sm opacity-80">Your ad could be here</p>
      </div>
    </div>
  );
}
