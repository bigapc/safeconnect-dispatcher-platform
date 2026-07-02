import { cn } from '@safeconnect/ui';
import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
};

export const Card = ({ className, children, ...props }: CardProps) => (
  <section className={cn('rounded-xl border border-border bg-card p-5 shadow-sm', className)} {...props}>
    {children}
  </section>
);
