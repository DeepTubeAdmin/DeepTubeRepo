import React from 'react';
import Footer from './Footer';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export default function Layout({ children, showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && <Header />}
      
      <div className="flex-grow">
        {children}
      </div>
      
      <div className="sticky bottom-0 w-full z-10 shadow-lg">
        <Footer />
      </div>
    </div>
  );
}