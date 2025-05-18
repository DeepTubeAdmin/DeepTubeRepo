import React from 'react';
import { Video } from '@/types';

interface VideoStructuredDataProps {
  video: Video;
}

/**
 * Formats duration in seconds to ISO 8601 duration format for structured data
 */
function formatDuration(seconds?: number): string {
  if (!seconds) return 'PT0S';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `PT${hours ? hours + 'H' : ''}${minutes ? minutes + 'M' : ''}${secs}S`;
}

/**
 * Component for adding structured data (JSON-LD) to video pages
 * This component will be used in production for SEO optimization
 * Not used in the test environment
 */
export default function VideoStructuredData({ video }: VideoStructuredDataProps) {
  // Handle optional fields safely
  const tags = Array.isArray(video.tags) ? video.tags.join(", ") : "";
  const categoryName = video.category && typeof video.category === 'object' ? video.category.name : "AI Generated Content";
  const username = video.user && typeof video.user === 'object' ? video.user.username : "DeepTube User";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.title,
    "description": video.description || '',
    "thumbnailUrl": video.thumbnail,
    "uploadDate": video.createdAt,
    "contentUrl": video.videoUrl,
    "embedUrl": `https://deeptube.co/embed/${video.id}`,
    "duration": formatDuration(video.duration),
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WatchAction",
      "userInteractionCount": video.views
    },
    "publisher": {
      "@type": "Organization",
      "name": "DeepTube.co",
      "logo": {
        "@type": "ImageObject",
        "url": "https://deeptube.co/logo.png"
      }
    },
    // Additional fields for better SEO
    "keywords": tags,
    "genre": categoryName,
    "creator": {
      "@type": "Person",
      "name": username
    }
  };
  
  return (
    <script 
      type="application/ld+json" 
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} 
    />
  );
}