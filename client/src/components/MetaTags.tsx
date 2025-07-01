import React from 'react';
import { Helmet } from 'react-helmet';

interface MetaTagsProps {
  title: string;
  description: string;
  videoUrl?: string;
  imageUrl: string;
  contentType: 'video' | 'image' | 'embed';
  contentId?: number;
  duration?: number;
  publishedAt?: string;
}

// This component will be used in production for optimizing social media embeds
// Not used in the test environment
export default function MetaTags({
  title,
  description,
  videoUrl,
  imageUrl,
  contentType,
  contentId,
  duration,
  publishedAt,
}: MetaTagsProps) {
  const baseUrl = "https://www.deeptubeai.com";
  const fullVideoUrl = videoUrl?.startsWith('http') ? videoUrl : `${baseUrl}${videoUrl}`;
  const fullImageUrl = imageUrl?.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title} | DeepTubeAI.com</title>
      <meta name="description" content={description} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={window.location.href} />
      <meta property="og:site_name" content="DeepTubeAI.com" />
      
      {/* Content-specific tags - Use images for both video and image content */}
      {(contentType === 'video' || contentType === 'image') && (
        <>
          <meta property="og:type" content="article" />
          <meta property="og:image" content={fullImageUrl} />
          <meta property="og:image:secure_url" content={fullImageUrl} />
          <meta property="og:image:width" content="1280" />
          <meta property="og:image:height" content="720" />
          {publishedAt && <meta property="article:published_time" content={publishedAt} />}
        </>
      )}
      
      {/* Twitter Card Tags - Always use image thumbnails */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@DeepTube_Co" />
      <meta name="twitter:creator" content="@DeepTube_Co" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
    </Helmet>
  );
}