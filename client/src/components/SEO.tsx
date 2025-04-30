import React from 'react';
import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  keywords?: string;
}

export default function SEO({
  title = 'DeepTube.co | AI Media Sharing Platform',
  description = 'Discover and share AI-generated videos, images, and content. Join DeepTube, the ethical community for AI media creators and enthusiasts.',
  canonicalUrl = 'https://deeptube.co',
  ogType = 'website',
  ogImage = '/og-image.jpg',
  keywords = 'AI media, AI videos, AI-generated content, ethical AI, AI community, AI creations'
}: SEOProps) {
  
  // Construct the full title
  const fullTitle = title === 'DeepTube.co | AI Media Sharing Platform' 
    ? title 
    : `${title} | DeepTube.co`;
    
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
