import { cn } from '@safeconnect/ui';
import type { HTMLAttributes } from 'react';

export const Table = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className="overflow-hidden rounded-xl border border-border bg-card">
    <table className={cn('min-w-full text-sm', className)}>{children}</table>
  </div>
);

export const THead = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-foreground/70">{children}</thead>
);

export const TBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>;

export const TR = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & {
  children: React.ReactNode;
}) => (
  <tr className={cn('border-t border-border', className)} {...props}>
    {children}
  </tr>
);

export const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 font-medium">{children}</th>
);

export const TD = ({ children }: { children: React.ReactNode }) => <td className="px-4 py-3">{children}</td>;
