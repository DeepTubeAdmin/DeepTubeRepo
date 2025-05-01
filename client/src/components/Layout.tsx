import React from 'react';
import Header from './Header';
import MiniFooter from './MiniFooter';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  simpleHeader?: boolean;
}

export default function Layout({ children, showHeader = true, showFooter = true, simpleHeader = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-['Roboto',sans-serif]">
      {showHeader && <Header simple={simpleHeader} />}
      
      <div className="flex-grow pb-16">
        {children}
      </div>
      
      {showFooter && <MiniFooter />}
    </div>
  );
}