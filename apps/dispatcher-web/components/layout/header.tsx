'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search';

export const Header = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [search, setSearch] = useState('');

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search assignments, incidents, couriers"
          />
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-xl border border-border bg-card px-3 text-sm">
            <option>All Organizations</option>
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
};
