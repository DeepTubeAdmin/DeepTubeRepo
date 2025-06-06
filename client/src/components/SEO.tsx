import React from 'react';
import { Helmet } from 'react-helmet';
import { generateWebsiteStructuredData } from '@/lib/structuredData';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  keywords?: string;
  structuredData?: string;
  isHome?: boolean;
}

export default function SEO({
  title = 'DeepTube: Ethical AI Media Hub',
  description = 'DeepTubeAI.com: Where innovative creators share responsible AI-powered media. Host, view, and explore trusted video content!',
  canonicalUrl = 'https://www.deeptubeai.com',
  ogType = 'website',
  ogImage = '/og-image.jpg',
  keywords = 'AI media hosting, Responsible AI media, Video hosting platform, DeepTube, AI-powered video, Trusted video content, Creator media platform, AI content sharing',
  structuredData,
  isHome = false
}: SEOProps) {
  
  // Construct the full title
  const fullTitle = title === 'DeepTube: Ethical AI Media Hub' 
    ? title 
    : title;
  
  // Add website schema for homepage
  const websiteSchema = isHome ? generateWebsiteStructuredData() : null;
    
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <link rel="icon" href="/favicon.png" type="image/png" />
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
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {structuredData}
        </script>
      )}
      
      {/* Website schema for homepage */}
      {isHome && websiteSchema && (
        <script type="application/ld+json">
          {websiteSchema}
        </script>
      )}
      
      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
    </Helmet>
  );
}
