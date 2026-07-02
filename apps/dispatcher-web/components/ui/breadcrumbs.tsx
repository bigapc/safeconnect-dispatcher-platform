import Link from 'next/link';
import type { Route } from 'next';

export const Breadcrumbs = ({ items }: { items: Array<{ label: string; href?: Route }> }) => (
  <nav aria-label="Breadcrumb" className="text-xs text-foreground/70">
    <ol className="flex flex-wrap items-center gap-2">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
          {index < items.length - 1 && <span>/</span>}
        </li>
      ))}
    </ol>
  </nav>
);
