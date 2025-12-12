'use client';

import { useState, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from './global-search';

export function SearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-2 h-9 rounded-xl bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 border border-gray-200/50 dark:border-gray-700 transition-all"
      >
        <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Search...</span>
        <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
          <Command className="h-3 w-3" />K
        </kbd>
      </Button>

      {/* Mobile search button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="sm:hidden hover:bg-white/50 dark:hover:bg-white/10 rounded-xl"
      >
        <Search className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </Button>

      <GlobalSearch isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
