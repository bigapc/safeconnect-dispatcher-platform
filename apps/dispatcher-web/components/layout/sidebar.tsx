'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@safeconnect/ui';
import { Activity, AlertTriangle, GraduationCap, LayoutDashboard, MapPinned, PackageCheck } from 'lucide-react';
import type { Route } from 'next';

const items = [
  { href: '/dashboard' as Route, label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assignments' as Route, label: 'Assignments', icon: PackageCheck },
  { href: '/maps' as Route, label: 'Maps', icon: MapPinned },
  { href: '/incidents' as Route, label: 'Incidents', icon: AlertTriangle },
  { href: '/live' as Route, label: 'Live Activity', icon: Activity },
  { href: '/academy' as Route, label: 'APC SafeConnect Academy', icon: GraduationCap },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-border bg-card p-3 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:p-5">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/65">SafeConnect</p>
        <h2 className="text-2xl font-semibold">Dispatcher</h2>
      </div>
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex min-w-max items-center gap-2 rounded-xl px-3 py-2 text-sm',
                active ? 'bg-primary text-white' : 'hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
