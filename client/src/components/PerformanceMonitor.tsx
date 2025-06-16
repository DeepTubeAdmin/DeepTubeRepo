import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

interface ApiCall {
  url: string;
  timestamp: number;
  method: string;
}

export default function PerformanceMonitor() {
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Intercept fetch calls to monitor API usage
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const [url, options] = args;
      const method = options?.method || 'GET';
      
      // Only track our API calls
      if (typeof url === 'string' && url.includes('/api/')) {
        setApiCalls(prev => [...prev, {
          url: url.replace(window.location.origin, ''),
          timestamp: Date.now(),
          method
        }].slice(-20)); // Keep only last 20 calls
      }
      
      return originalFetch(...args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Clear old calls every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setApiCalls(prev => prev.filter(call => now - call.timestamp < 30000));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const recentCalls = apiCalls.filter(call => Date.now() - call.timestamp < 10000);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-full shadow-lg transition-colors"
          title="Show Performance Monitor"
        >
          <Activity className="w-5 h-5" />
          {recentCalls.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {recentCalls.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg shadow-xl max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" />
          API Monitor
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="text-orange-400">
          Recent calls (10s): {recentCalls.length}
        </div>
        <div className="text-orange-400">
          Total tracked: {apiCalls.length}
        </div>
        
        <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
          {apiCalls.slice(-10).reverse().map((call, index) => (
            <div key={index} className="text-gray-300 text-xs">
              <span className="text-blue-400">{call.method}</span>{' '}
              <span className="break-all">{call.url}</span>
              <div className="text-gray-500 text-[10px]">
                {new Date(call.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
