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
  const baseUrl = "https://deeptube.co";
  const fullVideoUrl = videoUrl?.startsWith('http') ? videoUrl : `${baseUrl}${videoUrl}`;
  const fullImageUrl = imageUrl?.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title} | DeepTube.co</title>
      <meta name="description" content={description} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={window.location.href} />
      <meta property="og:site_name" content="DeepTube.co" />
      
      {/* Video-specific tags */}
      {contentType === 'video' && (
        <>
          <meta property="og:type" content="video.other" />
          <meta property="og:video" content={fullVideoUrl} />
          <meta property="og:video:url" content={fullVideoUrl} />
          <meta property="og:video:secure_url" content={fullVideoUrl} />
          <meta property="og:video:type" content="video/mp4" />
          <meta property="og:video:width" content="1280" />
          <meta property="og:video:height" content="720" />
          {duration && <meta property="og:video:duration" content={String(duration)} />}
          {publishedAt && <meta property="article:published_time" content={publishedAt} />}
          <meta property="og:image" content={fullImageUrl} />
        </>
      )}
      
      {/* Twitter Card Tags */}
      {contentType === 'video' ? (
        <>
          <meta name="twitter:card" content="player" />
          <meta name="twitter:player" content={`${baseUrl}/embed/${contentId}`} />
          <meta name="twitter:player:width" content="1280" />
          <meta name="twitter:player:height" content="720" />
        </>
      ) : (
        <meta name="twitter:card" content="summary_large_image" />
      )}
      <meta name="twitter:site" content="@DeepTube_Co" />
      <meta name="twitter:creator" content="@DeepTube_Co" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
    </Helmet>
  );
}