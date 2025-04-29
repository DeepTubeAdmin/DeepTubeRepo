import React from 'react';
import Footer from './Footer';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export default function Layout({ children, showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-['Roboto',sans-serif]">
      {showHeader && <Header />}
      
      <div className="flex-grow">
        {children}
      </div>
      
      <Footer />
    </div>
  );
}