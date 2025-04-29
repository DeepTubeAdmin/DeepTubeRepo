import React from 'react';
import Footer from './Footer';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export default function Layout({ children, showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {showHeader && <Header />}
      
      <div className="flex-grow container mx-auto px-4 pt-4 pb-12">
        {children}
      </div>
      
      <Footer />
    </div>
  );
}