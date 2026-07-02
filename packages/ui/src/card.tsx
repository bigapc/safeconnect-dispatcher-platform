import type { HTMLAttributes } from 'react';
import { cn } from './index';

export type UICardProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: UICardProps) => {
  return <div className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)} {...props} />;
};
