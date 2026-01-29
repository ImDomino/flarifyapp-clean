'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Подавляем ошибки от browser extensions
    if (error.message.includes('ethereum') || 
        error.message.includes('defineProperty') ||
        error.message.includes('extension')) {
      console.warn('Browser extension error suppressed:', error.message);
      return;
    }
    
    console.error('Application error:', error);
  }, [error]);

  // Если это ошибка от расширения - не показываем UI
  if (error.message.includes('ethereum') || 
      error.message.includes('defineProperty')) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-card rounded-[30px] border border-border p-8 card-shadow max-w-md">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#140106', letterSpacing: '-1px' }}>
          Something went wrong!
        </h2>
        <p className="text-muted-foreground mb-6" style={{ letterSpacing: '-1px' }}>
          {error.message}
        </p>
        <button
          onClick={reset}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold"
          style={{ fontSize: '18px', letterSpacing: '-1px' }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
